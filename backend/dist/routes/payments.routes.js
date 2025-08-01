"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const upload_1 = require("../utils/upload");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Create deposit
router.post('/deposit', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { amount, method, walletAddress, phoneNumber } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Amount is required and must be a number' });
        }
        const parsedAmount = parseFloat(amount);
        if (parsedAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        const validMethods = ['easypaisa', 'jazzcash', 'usdt'];
        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: 'Valid payment method is required' });
        }
        const transactionId = `TXN_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
        const transaction = new Transaction_1.default({
            user: userId,
            type: 'deposit',
            method,
            amount: parsedAmount,
            transactionId,
            walletAddress: walletAddress ? crypto_1.default.createHash('sha256').update(walletAddress).digest('hex') : undefined,
            phoneNumber: phoneNumber ? crypto_1.default.createHash('sha256').update(phoneNumber).digest('hex') : undefined,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'pending'
        });
        await transaction.save();
        // Get payment details from environment variables
        const paymentDetails = {
            amount: parsedAmount
        };
        switch (method) {
            case 'usdt':
                paymentDetails.walletAddress = process.env.USDT_WALLET_ADDRESS;
                paymentDetails.network = 'TRC20';
                break;
            case 'easypaisa':
                paymentDetails.accountName = process.env.EASYPAISA_ACCOUNT_NAME;
                paymentDetails.accountNumber = process.env.EASYPAISA_ACCOUNT_NUMBER;
                paymentDetails.instructions = 'Send payment to account and upload proof';
                break;
            case 'jazzcash':
                paymentDetails.accountName = process.env.JAZZCASH_ACCOUNT_NAME;
                paymentDetails.accountNumber = process.env.JAZZCASH_ACCOUNT_NUMBER;
                paymentDetails.instructions = 'Send payment to account and upload proof';
                break;
        }
        res.status(201).json({
            success: true,
            transactionId,
            paymentDetails,
            message: 'Deposit request created. Please upload payment proof.'
        });
    }
    catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Failed to create deposit' });
    }
});
// Create withdrawal
router.post('/withdrawal', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { amount, method, walletAddress, phoneNumber } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Amount is required and must be a number' });
        }
        const parsedAmount = parseFloat(amount);
        if (parsedAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        const validMethods = ['easypaisa', 'jazzcash', 'usdt'];
        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({ error: 'Valid payment method is required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        const transactionId = `TXN_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
        const transaction = new Transaction_1.default({
            user: userId,
            type: 'withdrawal',
            method,
            amount: parsedAmount,
            transactionId,
            walletAddress: walletAddress ? crypto_1.default.createHash('sha256').update(walletAddress).digest('hex') : undefined,
            phoneNumber: phoneNumber ? crypto_1.default.createHash('sha256').update(phoneNumber).digest('hex') : undefined,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'pending'
        });
        await transaction.save();
        // Deduct balance immediately for withdrawal requests
        user.balance -= parsedAmount;
        await user.save();
        res.status(201).json({
            success: true,
            transactionId,
            message: 'Withdrawal request submitted. Awaiting admin approval.'
        });
    }
    catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Failed to create withdrawal' });
    }
});
// Upload payment proof
router.post('/upload-proof', auth_middleware_1.authenticateToken, upload_1.upload.single('proof'), async (req, res) => {
    try {
        const { transactionId } = req.body;
        const proofImage = req.file?.path;
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        if (!proofImage) {
            return res.status(400).json({ error: 'Proof image is required' });
        }
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const transaction = await Transaction_1.default.findOne({
            transactionId,
            user: req.user?.userId
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        transaction.proofImage = proofImage;
        await transaction.save();
        res.json({
            success: true,
            message: 'Proof uploaded successfully',
            proofUrl: proofImage
        });
    }
    catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ error: 'Failed to upload proof' });
    }
});
// Get user transactions
router.get('/transactions', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const transactions = await Transaction_1.default.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('user', 'username email');
        res.json({
            success: true,
            data: transactions
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
exports.default = router;
