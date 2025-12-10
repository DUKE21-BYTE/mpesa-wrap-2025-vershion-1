const express = require('express');
const axios = require('axios');
const Session = require('../models/Session');
const { generateReport } = require('../services/analytics');

const router = express.Router();

// --- Configuration ---
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
// Standard Sandbox Passkey (Publicly available for 174379)
const PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const SHORTCODE = process.env.MPESA_SHORTCODE || '174379'; // Default Test Paybill
// Safaricom rejects 'localhost'. We use a dummy valid URL to allow the STK Push to trigger.
// In production, this MUST be your real live domain.
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://google.com';



const DARJA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Change to live for production

// Pricing Tier Definition
const PRICING = {
    'summary': 0,        // Free Tier
    'full_report': 10,   // Standard
    'deep_analysis': 20  // Premium
};

/**
 * Middleware to generate M-Pesa Access Token
 */
const getAccessToken = async (req, res, next) => {
    try {
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        const response = await axios.get(`${DARJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        req.accessToken = response.data.access_token;
        next();
    } catch (error) {
        console.error('AccessToken Error:', error.response?.data || error.message);
        res.status(500).json({ status: 'failed', message: 'Failed to authenticate with M-Pesa' });
    }
};

/**
 * 1. Initiate Payment (STK Push)
 */
router.post('/initiate-payment', getAccessToken, async (req, res) => {
    let { sessionID, reportType, phoneNumber } = req.body;

    if (!sessionID || !reportType || !phoneNumber) {
        return res.status(400).json({ status: 'failed', message: 'Missing required fields.' });
    }

    // --- Validate & Format Phone Number (2547...) ---
    phoneNumber = String(phoneNumber).trim().replace(/\s+/g, '');
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(1);
    } // else assume it's already 254... or invalid, Safari will reject if invalid.


    const cost = PRICING[reportType];
    if (cost === undefined) {
        return res.status(400).json({ status: 'failed', message: 'Invalid report type.' });
    }

    try {
        const session = await Session.findOne({ sessionID });
        if (!session) {
            return res.status(404).json({ status: 'failed', message: 'Session not found.' });
        }

        // Logic for FREE Tier
        if (cost === 0) {
            session.paymentStatus = 'FREE';
            session.reportType = reportType;
            await session.save();
            const report = await generateReport(session);
            return res.status(200).json({
                status: 'free_success',
                message: 'Free report generated successfully.',
                redirectUrl: `/report/${report._id}`
            });
        }

        // --- STK Push Logic ---
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        const payload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline', // Or CustomerBuyGoodsOnline
            Amount: cost,
            PartyA: phoneNumber, // Customer Phone
            PartyB: SHORTCODE,   // Organization Shortcode
            PhoneNumber: phoneNumber,
            CallBackURL: CALLBACK_URL,
            AccountReference: 'MpesaWrapped',
            TransactionDesc: `Payment for ${reportType}`
        };

        console.log('Initiating STK Push:', payload.PartyA, 'Amount:', payload.Amount);

        const response = await axios.post(`${DARJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                Authorization: `Bearer ${req.accessToken}`
            }
        });

        // Save session details including CheckoutRequestID for callback matching
        session.reportType = reportType;
        session.amountDue = cost;
        session.phoneNumber = phoneNumber;
        session.checkoutRequestID = response.data.CheckoutRequestID;
        session.paymentStatus = 'PENDING';
        await session.save();

        return res.status(200).json({
            status: 'stk_push_sent',
            message: 'STK Push sent. Check your phone.',
            checkoutRequestID: response.data.CheckoutRequestID
        });

    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Payment initiation failed.',
            details: error.response?.data
        });
    }
});

/**
 * 2. Payment Callback (Webhook)
 */
router.post('/callback', async (req, res) => {
    console.log('--- M-Pesa Callback Received ---');

    // Safaricom expects a 200 OK immediately
    res.status(200).send('OK');

    try {
        const callbackData = req.body.Body.stkCallback;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode; // 0 is Success, others are failures
        const callbackMetadata = callbackData.CallbackMetadata;

        console.log(`Callback for ReqID: ${checkoutRequestID}, ResultCode: ${resultCode}`);

        const session = await Session.findOne({ checkoutRequestID });
        if (!session) {
            console.error('Session not found for CheckoutRequestID:', checkoutRequestID);
            return;
        }

        if (resultCode === 0) {
            // SUCCESS
            // Extract M-Pesa Receipt Number
            const receiptItem = callbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
            const receiptNumber = receiptItem ? receiptItem.Value : 'UNKNOWN';

            session.paymentStatus = 'PAID';
            session.mpesaReceipt = receiptNumber;
            await session.save();

            // Trigger Report Generation
            await generateReport(session);
            console.log(`Payment confirmed (${receiptNumber}). Report generated.`);
        } else {
            // FAILED / CANCELLED
            session.paymentStatus = 'FAILED';
            await session.save();
            console.warn('Payment failed/cancelled by user.');
        }

    } catch (error) {
        console.error('Callback Processing Error:', error);
    }
});

/**
 * 3. Check Payment Status (Polling from Frontend)
 */
router.get('/status/:sessionID', async (req, res) => {
    try {
        const session = await Session.findOne({ sessionID: req.params.sessionID });
        if (!session) return res.status(404).json({ status: 'not_found' });

        // If explicitly 'PAID', we are good.
        // If 'PENDING', we might want to query Daraja for status, but simpler to just return DB state for now.

        return res.json({
            status: session.paymentStatus,
            mpesaReceipt: session.mpesaReceipt
        });
    } catch (error) {
        return res.status(500).json({ status: 'error' });
    }
});

module.exports = router;
