
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

module.exports = { parseMpesaText };
