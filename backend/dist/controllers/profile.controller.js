"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = exports.getMe = void 0;
const User_1 = __importDefault(require("../models/User"));
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id).select('-password -twoFactorSecret');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMe = getMe;
const updateMe = async (req, res) => {
    try {
        const { username, email, phone, avatar } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (username)
            user.username = username;
        if (email)
            user.email = email;
        if (phone)
            user.phone = phone;
        if (avatar)
            user.avatar = avatar;
        await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateMe = updateMe;
