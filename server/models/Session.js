const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true
    },
    // The path where Multer temporarily saved the PDF
    tempFilePath: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FREE', 'FAILED'],
        default: 'PENDING'
    },
    isEncrypted: {
        type: Boolean,
        default: false
    },
    // ADD THIS NEW FIELD:
    parsedData: {
        type: Array, // Store the array of JSON transaction objects
        default: []
    },
    sessionID: { // A unique ID for frontend tracking/API reference
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '2h' // Cleanup sessions after 2 hours if not completed
    },
    // Payment Fields
    phoneNumber: { type: String },
    amountDue: { type: Number },
    paymentGatewayRef: { type: String }, // For internal ref
    checkoutRequestID: { type: String }, // Crucial for M-Pesa Callback matching
    mpesaReceipt: { type: String },
    reportType: { type: String }
});

module.exports = mongoose.model('Session', SessionSchema);
