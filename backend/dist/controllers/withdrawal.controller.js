"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSendUSDT = exports.uploadWithdrawalProof = exports.createWithdrawal = void 0;
const User_1 = __importDefault(require("../models/User"));
const transaction_1 = __importDefault(require("../models/transaction"));
const createWithdrawal = async (req, res) => {
    const { amount, method, accountDetails } = req.body;
    const user = await User_1.default.findById(req.user.id);
    if (!user || user.balance < +amount)
        return res.status(400).json({ message: 'Insufficient balance' });
    const tx = await transaction_1.default.create({
        user: user._id,
        type: 'withdrawal',
        method,
        amount: +amount,
        accountDetails,
        status: 'pending'
    });
    // optionally lock balance (add a pendingWithdrawal field)
    res.json({ txId: tx._id });
};
exports.createWithdrawal = createWithdrawal;
const uploadWithdrawalProof = async (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: 'Screenshot required' });
    const { txId } = req.body;
    await transaction_1.default.findByIdAndUpdate(txId, { screenshot: req.file.path });
    res.json({ message: 'Proof uploaded. Admin will process shortly.' });
};
exports.uploadWithdrawalProof = uploadWithdrawalProof;
const adminSendUSDT = async (req, res) => {
    const { txId, txHash } = req.body; // txHash from admin manual payout
    const tx = await transaction_1.default.findById(txId);
    if (!tx || tx.type !== 'withdrawal' || tx.status !== 'pending')
        return res.status(400).json({ message: 'Bad tx' });
    tx.status = 'approved';
    tx.txHash = txHash;
    await tx.save();
    res.json({ message: 'USDT sent and marked complete' });
};
exports.adminSendUSDT = adminSendUSDT;
