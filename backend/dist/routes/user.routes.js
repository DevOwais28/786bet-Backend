"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const router = (0, express_1.Router)();
// Get user profile
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: user.username,
            email: user.email,
            balance: user.balance,
            role: user.role,
            referralCode: user.referralCode,
            totalWinnings: user.totalWinnings || 0,
            gamesPlayed: user.gamesPlayed || 0,
            referralEarnings: user.referralEarnings || 0,
            totalReferrals: user.totalReferrals || 0,
            activeReferrals: user.activeReferrals || 0,
            createdAt: user.createdAt
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});
// Update user profile
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User_1.default.findByIdAndUpdate(req.user.userId, { username, email }, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: user.username,
            email: user.email,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Get user transactions
router.get('/transactions', auth_1.authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction_1.default.find({ user: req.user.userId })
            .sort({ createdAt: -1 })
            .select('-ipAddress -userAgent');
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Get user dashboard stats
router.get('/dashboard', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const transactions = await Transaction_1.default.find({ user: userId });
        const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'approved');
        const withdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved');
        const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
        res.json({
            username: user.username,
            email: user.email,
            balance: user.balance,
            totalDeposits,
            totalWithdrawals,
            totalWinnings: user.totalWinnings || 0,
            gamesPlayed: user.gamesPlayed || 0,
            referralCode: user.referralCode,
            referralEarnings: user.referralEarnings || 0,
            totalReferrals: user.totalReferrals || 0,
            activeReferrals: user.activeReferrals || 0
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});
exports.default = router;
