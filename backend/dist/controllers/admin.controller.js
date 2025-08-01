"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveTx = exports.analyticsSummary = exports.gameSettings = exports.adjustBalance = exports.banUser = exports.updateUser = exports.listUsers = void 0;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const listUsers = async (_, res) => {
    const users = await User_1.default.find().select('-password');
    res.json(users);
};
exports.listUsers = listUsers;
const updateUser = async (req, res) => {
    const { id } = req.params;
    const user = await User_1.default.findByIdAndUpdate(id, req.body, { new: true }).select('-password');
    res.json(user);
};
exports.updateUser = updateUser;
const banUser = async (req, res) => {
    const { id } = req.params;
    await User_1.default.findByIdAndUpdate(id, { banned: true });
    res.json({ message: 'Banned' });
};
exports.banUser = banUser;
const adjustBalance = async (req, res) => {
    const { userId, amount, reason } = req.body;
    await User_1.default.findByIdAndUpdate(userId, { $inc: { balance: amount } });
    await Transaction_1.default.create({ user: userId, type: 'manual', amount, status: 'approved', reason });
    res.json({ message: 'Balance adjusted' });
};
exports.adjustBalance = adjustBalance;
const gameSettings = async (req, res) => {
    const { rtp, enabled } = req.body;
    process.env.GAME_RTP = rtp;
    process.env.GAME_ENABLED = enabled;
    res.json({ message: 'Settings updated' });
};
exports.gameSettings = gameSettings;
const analyticsSummary = async (_, res) => {
    const totalDeposit = await Transaction_1.default.aggregate([
        { $match: { type: 'deposit', status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdraw = await Transaction_1.default.aggregate([
        { $match: { type: 'withdrawal', status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const newUsers = await User_1.default.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    res.json({
        totalDeposit: totalDeposit[0]?.total || 0,
        totalWithdraw: totalWithdraw[0]?.total || 0,
        newUsers,
    });
};
exports.analyticsSummary = analyticsSummary;
const approveTx = async (req, res) => {
    const { id } = req.params;
    const { approve } = req.body;
    const tx = await Transaction_1.default.findById(id).populate('user');
    if (!tx)
        return res.status(404).json({ message: 'Tx not found' });
    tx.status = approve ? 'approved' : 'rejected';
    tx.approvedBy = req.user.id;
    tx.approvedAt = new Date();
    await tx.save();
    // update balance
    if (approve && tx.type === 'deposit') {
        await User_1.default.findByIdAndUpdate(tx.user, { $inc: { balance: tx.amount } });
    }
    if (approve && tx.type === 'withdrawal') {
        await User_1.default.findByIdAndUpdate(tx.user, { $inc: { balance: -tx.amount } });
    }
    res.json({ message: `Transaction ${approve ? 'approved' : 'rejected'}` });
};
exports.approveTx = approveTx;
