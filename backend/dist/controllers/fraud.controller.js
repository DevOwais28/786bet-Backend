"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskScore = void 0;
const LoginLog_1 = __importDefault(require("../models/LoginLog"));
const getRiskScore = async (ip, userAgent, userId) => {
    const logs = await LoginLog_1.default.find({ ip, userAgent, success: false }).countDocuments();
    return Math.min(logs * 2, 100); // simple heuristic
};
exports.getRiskScore = getRiskScore;
