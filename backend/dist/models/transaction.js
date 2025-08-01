"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const crypto_1 = __importDefault(require("crypto"));
const algorithm = 'aes-256-cbc';
const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
// Encryption helper
const encrypt = (text) => {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};
const TxSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    method: {
        type: String,
        enum: ['jazzcash', 'easypaisa', 'usdt', 'bank_transfer'],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    screenshot: String,
    proofImage: String,
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedAt: Date,
    rejectedReason: String,
    walletAddress: String,
    phoneNumber: String,
    accountName: String,
    transactionId: { type: String, unique: true, required: true },
    notes: String,
    processedBy: String,
    ipAddress: String,
    userAgent: String,
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            // Remove sensitive data from JSON response
            delete ret.ipAddress;
            delete ret.userAgent;
            return ret;
        }
    }
});
exports.default = (0, mongoose_1.model)('Transaction', TxSchema);
