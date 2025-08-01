"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const LoginLogSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    ip: String,
    userAgent: String,
    success: Boolean,
    riskScore: { type: Number, default: 0 },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('LoginLog', LoginLogSchema);
