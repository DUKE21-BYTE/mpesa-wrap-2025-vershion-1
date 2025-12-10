const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const { parseMpesaText } = require('../utils/mpesaParser');

const router = express.Router();

// 1. Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp_uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed.'), false);
        }
        cb(null, true);
    }
}).single('mpesaStatement'); // Expects field 'mpesaStatement', fallback to 'file' if needed

// 2. Step 1: Upload & Encryption Check
router.post('/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ status: 'failed', message: err.message });
        if (!req.file) return res.status(400).json({ status: 'failed', message: 'No file uploaded.' });

        const filePath = req.file.path;
        const { email } = req.body;

        try {
            // Check Encryption
            const dataBuffer = await fs.readFile(filePath);
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

            let isEncrypted = false;
            try {
                // Try determining if password is required by loading with NO password
                const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(dataBuffer),
                    password: '',
                    disableFontFace: true,
                    verbosity: 0
                });
                await loadingTask.promise;
            } catch (e) {
                if (e.name === 'PasswordException' || e.message.includes('PasswordException')) {
                    isEncrypted = true;
                } else {
                    // Actual corruption or format error
                    await fs.unlink(filePath);
                    return res.status(400).json({ status: 'failed', message: 'Invalid PDF file.' });
                }
            }

            // Create Session
            const sessionID = uuidv4();
            const newSession = new Session({
                email: email || 'anonymous@user.com',
                tempFilePath: filePath,
                isEncrypted: isEncrypted,
                sessionID: sessionID,
                paymentStatus: 'PENDING'
            });
            await newSession.save();

            return res.status(200).json({
                status: 'success',
                sessionID: sessionID,
                isEncrypted: isEncrypted
            });

        } catch (error) {
            console.error('Upload Error:', error);
            await fs.unlink(filePath).catch(() => { });
            return res.status(500).json({ status: 'error', message: 'Server error during upload.' });
        }
    });
});

// 3. Step 2: Parse (Decrypt & Process)
router.post('/parse', async (req, res) => {
    const { sessionID, password } = req.body;

    if (!sessionID) return res.status(400).json({ status: 'failed', message: 'Missing sessionID.' });

    try {
        const session = await Session.findOne({ sessionID });
        if (!session) return res.status(404).json({ status: 'failed', message: 'Session expired or not found.' });

        const filePath = session.tempFilePath;
        if (!filePath) return res.status(404).json({ status: 'failed', message: 'File not found.' });

        // Decrypt & Parse
        const dataBuffer = await fs.readFile(filePath);
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        try {
            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(dataBuffer),
                password: password || '', // Pass provided password
                disableFontFace: true,
                verbosity: 0
            });

            const doc = await loadingTask.promise;

            let fullText = "";
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const content = await page.getTextContent();

                let lastY = -1;
                let pageText = "";
                const items = content.items;

                for (const item of items) {
                    if ('str' in item) {
                        const currentY = item.transform ? item.transform[5] : 0;
                        if (lastY !== -1 && Math.abs(currentY - lastY) > 4) {
                            pageText += "\n";
                        } else if (pageText.length > 0 && !pageText.endsWith("\n") && item.str.trim().length > 0) {
                            pageText += " ";
                        }
                        pageText += item.str;
                        lastY = currentY;
                    }
                }
                fullText += pageText + "\n";
            }

            const transactions = parseMpesaText(fullText);

            if (!transactions || transactions.length === 0) {
                return res.status(400).json({ status: 'failed', message: 'No transactions found.' });
            }

            // Cleanup & Save
            session.parsedData = transactions;
            session.isEncrypted = false;
            await session.save();
            await fs.unlink(filePath); // Delete file after success

            return res.status(200).json({
                status: 'parsed_success',
                sessionID: sessionID,
                transactions: transactions
            });

        } catch (error) {
            if (error.name === 'PasswordException' || error.message.includes('PasswordException')) {
                return res.status(200).json({ status: 'failed_password', message: 'Incorrect password.' }); // Note: 200 OK because it's a handled logic state
            }
            throw error;
        }

    } catch (error) {
        console.error('Parse Error:', error);
        return res.status(500).json({ status: 'error', message: 'Parsing failed.' });
    }
});

// 4. Text Processing
router.post('/process-text', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text.' });
    try {
        const transactions = parseMpesaText(text);
        return res.status(200).json({ status: 'success', transactions });
    } catch (e) {
        return res.status(500).json({ error: 'Failed.' });
    }
});

module.exports = router;
