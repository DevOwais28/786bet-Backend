"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GameResultSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: String, required: true },
    betAmount: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 1 },
    outcome: { type: String, enum: ['win', 'loss', 'cashout'], required: true },
    winnings: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
// Index for efficient queries
GameResultSchema.index({ user: 1, createdAt: -1 });
GameResultSchema.index({ gameId: 1 });
exports.default = (0, mongoose_1.model)('GameResult', GameResultSchema);
