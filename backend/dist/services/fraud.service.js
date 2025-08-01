"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logLogin = void 0;
const LoginLog_1 = __importDefault(require("../models/LoginLog"));
const logLogin = async (userId, ip, userAgent, success) => {
    let risk = 0;
    const failures = await LoginLog_1.default.find({ ip, success: false }).countDocuments();
    if (failures > 3)
        risk += 30;
    await LoginLog_1.default.create({ user: userId, ip, userAgent, success, riskScore: risk });
    return risk;
};
exports.logLogin = logLogin;
