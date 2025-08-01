"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = __importDefault(require("../models/User"));
const transaction_1 = __importDefault(require("../models/transaction"));
const router = express_1.default.Router();
// Get wallet data including balance and transactions
router.get('/wallet', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User_1.default.findById(userId).select('balance');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const transactions = await transaction_1.default.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({
            success: true,
            data: {
                balance: user.balance,
                transactions: transactions.map(tx => ({
                    id: tx._id,
                    type: tx.type,
                    method: tx.method,
                    amount: tx.amount,
                    status: tx.status,
                    createdAt: tx.createdAt,
                    accountDetails: tx.accountDetails
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching wallet data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
