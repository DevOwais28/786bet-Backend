"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTree = void 0;
const Referral_1 = __importDefault(require("../models/Referral"));
const getMyTree = async (req, res) => {
    const referrals = await Referral_1.default.find({ referrer: req.user.id }).populate('referee', 'username email');
    res.json(referrals);
};
exports.getMyTree = getMyTree;
