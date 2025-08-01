"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const RoundSchema = new mongoose_1.Schema({
    roundId: { type: Number, unique: true },
    startTime: { type: Date, default: Date.now },
    crashPoint: Number,
    status: { type: String, default: 'waiting' },
});
exports.default = (0, mongoose_1.model)('Round', RoundSchema);
