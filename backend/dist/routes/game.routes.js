"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const GameResult_1 = __importDefault(require("../models/GameResult"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// Get user's game history
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const gameHistory = await GameResult_1.default.find({ user: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(gameHistory);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch game history' });
    }
});
// Get recent games
router.get('/recent', async (req, res) => {
    try {
        const recentGames = await GameResult_1.default.find({})
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'username')
            .select('-user');
        res.json(recentGames);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent games' });
    }
});
// Create game result (for game completion)
router.post('/result', auth_1.authenticateToken, async (req, res) => {
    try {
        const { gameId, betAmount, multiplier, outcome, winnings } = req.body;
        const gameResult = new GameResult_1.default({
            user: req.user.userId,
            gameId,
            betAmount,
            multiplier,
            outcome,
            winnings,
            createdAt: new Date()
        });
        await gameResult.save();
        // Update user stats
        await User_1.default.findByIdAndUpdate(req.user.userId, {
            $inc: {
                gamesPlayed: 1,
                totalWinnings: winnings,
                ...(outcome === 'win' && { totalWinnings: winnings - betAmount })
            }
        });
        res.json({ success: true, gameResult });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save game result' });
    }
});
exports.default = router;
