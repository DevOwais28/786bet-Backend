"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'moderator', 'finance', 'super-admin'], default: 'user' },
    balance: { type: Number, default: 0 },
    twoFactorSecret: String,
    twoFactorEnabled: { type: Boolean, default: false },
    lastLoginAt: Date,
    lastLoginIP: String,
}, { timestamps: true });
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
exports.default = (0, mongoose_1.model)('User', UserSchema);
