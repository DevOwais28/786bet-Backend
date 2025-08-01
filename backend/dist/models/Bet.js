"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BetSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    round: Number,
    amount: Number,
    cashOutAt: Number,
    multiplier: Number,
    profit: Number,
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Bet', BetSchema);
