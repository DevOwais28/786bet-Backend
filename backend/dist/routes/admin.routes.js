"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// Get pending transactions for admin review
router.get('/transactions/pending', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin', 'finance'), async (req, res) => {
    try {
        const transactions = await Transaction_1.default.find({ status: 'pending' })
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending transactions' });
    }
});
// Approve transaction
router.post('/transactions/:id/approve', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin', 'finance'), async (req, res) => {
    try {
        const transaction = await Transaction_1.default.findById(req.params.id).populate('user');
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction already processed' });
        }
        transaction.status = 'approved';
        transaction.approvedBy = req.user.userId;
        transaction.approvedAt = new Date();
        await transaction.save();
        // For deposits, add to user balance
        if (transaction.type === 'deposit') {
            const user = await User_1.default.findById(transaction.user);
            if (user) {
                user.balance += transaction.amount;
                await user.save();
            }
        }
        res.json({ success: true, message: 'Transaction approved' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to approve transaction' });
    }
});
// Reject transaction
router.post('/transactions/:id/reject', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin', 'finance'), async (req, res) => {
    try {
        const { reason } = req.body;
        const transaction = await Transaction_1.default.findById(req.params.id).populate('user');
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction already processed' });
        }
        transaction.status = 'rejected';
        transaction.rejectedReason = reason;
        transaction.rejectedAt = new Date();
        transaction.processedBy = req.user.userId;
        await transaction.save();
        // For withdrawals, refund balance
        if (transaction.type === 'withdrawal') {
            const user = await User_1.default.findById(transaction.user);
            if (user) {
                user.balance += transaction.amount;
                await user.save();
            }
        }
        res.json({ success: true, message: 'Transaction rejected' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject transaction' });
    }
});
// Get all users
router.get('/users', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin'), async (req, res) => {
    try {
        const users = await User_1.default.find({}, 'username email role balance createdAt isActive')
            .sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Update user role
router.put('/users/:id/role', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin'), async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['user', 'moderator', 'finance', 'super-admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
// Get admin analytics
router.get('/analytics', auth_1.authenticateToken, (0, auth_1.requireRole)('super-admin'), async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({ isActive: true });
        const totalDeposits = await Transaction_1.default.aggregate([
            { $match: { type: 'deposit', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawals = await Transaction_1.default.aggregate([
            { $match: { type: 'withdrawal', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        res.json({
            totalUsers,
            activeUsers,
            totalDeposits: totalDeposits[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            pendingDeposits: await Transaction_1.default.countDocuments({ type: 'deposit', status: 'pending' }),
            pendingWithdrawals: await Transaction_1.default.countDocuments({ type: 'withdrawal', status: 'pending' })
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
exports.default = router;
