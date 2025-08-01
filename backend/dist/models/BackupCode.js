"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const BackupCodeSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    used: { type: Boolean, default: false },
});
exports.default = (0, mongoose_1.model)('BackupCode', BackupCodeSchema);
