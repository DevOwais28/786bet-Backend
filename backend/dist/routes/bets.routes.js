"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const Bet_1 = __importDefault(require("../models/Bet"));
const router = express_1.default.Router();
// Get user's game history
router.get('/bets/history', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const bets = await Bet_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        const history = bets.map((bet) => ({
            id: bet._id,
            game: bet.gameType || 'Crash Game',
            betAmount: bet.betAmount,
            multiplier: bet.multiplier || 1,
            profit: bet.profit,
            timestamp: bet.createdAt,
            status: bet.profit > 0 ? 'win' : 'loss'
        }));
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Get user stats
router.get('/user/stats', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [totalBets, totalWinnings, winRate, biggestWin, totalProfit] = await Promise.all([
            Bet_1.default.countDocuments({ userId }),
            Bet_1.default.aggregate([
                { $match: { userId, status: 'completed', profit: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: '$profit' } } }
            ]),
            Bet_1.default.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: null,
                        wins: { $sum: { $cond: [{ $gt: ['$profit', 0] }, 1, 0] } },
                        total: { $sum: 1 }
                    }
                }
            ]),
            Bet_1.default.findOne({ userId, profit: { $gt: 0 } }).sort({ profit: -1 }),
            Bet_1.default.aggregate([
                { $match: { userId, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$profit' } } }
            ])
        ]);
        const stats = {
            totalBets,
            totalWinnings: totalWinnings[0]?.total || 0,
            winRate: winRate[0] ? (winRate[0].wins / winRate[0].total) * 100 : 0,
            biggestWin: biggestWin?.profit || 0,
            totalProfit: totalProfit[0]?.total || 0,
            gamesPlayed: totalBets
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
