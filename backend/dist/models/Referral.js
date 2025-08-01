"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ReferralSchema = new mongoose_1.Schema({
    referrer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    referee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    bonus: { type: Number, default: 0 },
    claimed: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)('Referral', ReferralSchema);
