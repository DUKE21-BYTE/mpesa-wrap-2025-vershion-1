import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');
const { readFile, utils } = xlsx;
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper: Parse M-PESA Text (Regex Magic)
const parseMpesaText = (text) => {
    const transactions = [];
    const lines = text.split('\n');

    // Regex patterns for standard M-PESA SMS (Single line usually)
    const sentPattern = /([A-Z0-9]+)\s+Confirmed\.\s+Ksh([0-9,.]+)\s+sent\s+to\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s?(?:AM|PM))/i;
    const receivedPattern = /([A-Z0-9]+)\s+Confirmed\.\s+You\s+have\s+received\s+Ksh([0-9,.]+)\s+from\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s?(?:AM|PM))/i;
    const paybillPattern = /([A-Z0-9]+)\s+Confirmed\.\s+Ksh([0-9,.]+)\s+sent\s+to\s+(.+?)\s+for\s+account\s+(.+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s?(?:AM|PM))/i;

    // Detect start of a PDF statement row: ID follow by Date
    // Example: TL6HZ097WP 2025-12-06 ...
    const pdfStartPattern = /^([A-Z0-9]{10})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/;

    // Detect end of a PDF statement row (Completed + Amounts)
    // Matches: ... Completed -35.00 233.27
    const pdfEndPattern = /Completed\s+([0-9,.\-]+)(?:\s+([0-9,.\-]+))?$/i;

    let buffer = '';

    lines.forEach((line) => {
        line = line.trim();
        if (!line) return;

        // 1. Check for single-line SMS matches first (High priority)
        let match;
        if ((match = line.match(sentPattern)) || (match = line.match(receivedPattern)) || (match = line.match(paybillPattern))) {
            // Process as SMS immediately
            let type = 'UNKNOWN';
            let amount = 0;
            let entity = '';
            let date = '';
            let code = '';

            if (line.match(sentPattern)) {
                type = 'SEND';
                code = match[1];
                amount = parseFloat(match[2].replace(/,/g, ''));
                entity = match[3];
                date = match[4] + ' ' + match[5];
            } else if (line.match(receivedPattern)) {
                type = 'RECEIVE';
                code = match[1];
                amount = parseFloat(match[2].replace(/,/g, ''));
                entity = match[3];
                date = match[4] + ' ' + match[5];
            } else {
                type = 'PAYBILL';
                code = match[1];
                amount = parseFloat(match[2].replace(/,/g, ''));
                entity = match[3];
                date = match[5] + ' ' + match[6];
            }

            transactions.push({ id: code, date: new Date(date).toISOString(), description: entity, amount, type, raw: line });
            buffer = ''; // Clear buffer if we matched an SMS on a single line
            return;
        }

        // 2. Multiline Statement Parsing
        // If line starts with a Receipt Code, it's a NEW transaction start.
        if (pdfStartPattern.test(line)) {
            // If we had a previous buffer that wasn't processed, we might be discarding it (incomplete), or we could try to force process it.
            // For now, let's assume specific start start = new record.
            buffer = line;
        } else {
            // Append to buffer if we have one
            if (buffer) {
                buffer += ' ' + line;
            }
        }

        // Check if buffer is now "Complete"
        if (buffer && pdfEndPattern.test(buffer)) {
            // We have a full record in buffer!
            // Parse it.
            // Pattern to extract all parts from the buffer
            // ^(ID) (Date) (Details) Completed (Amount) (Balance?)$
            const fullMatch = buffer.match(/^([A-Z0-9]{10})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+?)\s+Completed\s+([0-9,.\-]+)(?:\s+([0-9,.\-]+))?$/i);

            if (fullMatch) {
                const code = fullMatch[1];
                const date = fullMatch[2];
                const entity = fullMatch[3].trim();
                const rawAmount = parseFloat(fullMatch[4].replace(/,/g, ''));

                let type = 'UNKNOWN';
                let amount = 0;

                if (rawAmount < 0) {
                    type = 'SEND';
                    amount = Math.abs(rawAmount);
                    if (/Pay\s*Bill/i.test(entity) || /Merchant/i.test(entity)) {
                        type = 'PAYBILL';
                    }
                } else {
                    type = 'RECEIVE';
                    amount = rawAmount;
                }

                transactions.push({
                    id: code,
                    date: new Date(date).toISOString(),
                    description: entity,
                    amount: amount,
                    type: type,
                    raw: buffer
                });
                buffer = ''; // Reset
            }
        }
    });

    console.log(`Parsed ${transactions.length} transactions from text.`);
    return transactions;
};

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;
        let extractedText = '';
        let transactions = [];

        // 1. PDF Processing
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const password = req.body.password || '';

            // Using pdfjs-dist for password support
            // Load the document
            try {
                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(dataBuffer),
                    password: password,
                    disableFontFace: true,
                });

                const doc = await loadingTask.promise;

                let fullText = '';
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                extractedText = fullText;
                transactions = parseMpesaText(extractedText);
            } catch (pdfError) {
                console.error("PDF Parsing Error:", pdfError);
                if (pdfError.name === 'PasswordException' || pdfError.message.includes('Password')) {
                    return res.status(400).json({ error: 'Incorrect Password', details: 'Please check your PDF password.' });
                }
                throw pdfError;
            }
        }
        // 2. Excel / CSV Processing
        else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
            console.log(`Processing Excel/CSV: ${mimeType}`);

            let processPath = filePath;
            if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
                if (req.file.originalname.endsWith('.csv') || mimeType === 'text/csv') {
                    const newPath = filePath + '.csv';
                    fs.renameSync(filePath, newPath);
                    processPath = newPath;
                }
            }

            const workbook = readFile(processPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = utils.sheet_to_json(sheet);

            transactions = json.map((row, i) => ({
                id: `EXCEL-${i}`,
                date: row['Date'] || row['Completion Time'] || new Date().toISOString(),
                description: row['Details'] || row['Name'] || 'Unknown',
                amount: row['Amount'] || row['Paid In'] || row['Paid Out'] || 0,
                type: row['Paid In'] ? 'RECEIVE' : 'SEND'
            }));
            extractedText = JSON.stringify(transactions, null, 2);

            if (processPath !== filePath && fs.existsSync(processPath)) {
                fs.unlinkSync(processPath);
            }
        }
        // 3. Image OCR
        else if (mimeType.startsWith('image/')) {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(filePath);
            extractedText = ret.data.text;
            transactions = parseMpesaText(extractedText);
            await worker.terminate();
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            count: transactions.length,
            preview: extractedText.substring(0, 1000) + '...',
            transactions: transactions
        });

    } catch (error) {
        console.error('Processing Error:', error);
        res.status(500).json({ error: 'Failed to process file', details: error.message });
    }
});

app.post('/process-text', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const transactions = parseMpesaText(text);

        res.json({
            success: true,
            count: transactions.length,
            preview: text.substring(0, 100) + '...',
            transactions: transactions
        });

    } catch (error) {
        console.error('Processing Error:', error);
        res.status(500).json({ error: 'Failed to process text', details: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend parsing engine running on port ${PORT}`);
});
