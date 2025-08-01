"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginNotification = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendLoginNotification = async (email, ip) => {
    await transporter.sendMail({
        to: email,
        subject: 'Login Alert – 786Bet',
        html: `A new login was detected from IP <b>${ip}</b>.<br>If this wasn’t you, contact support immediately.`,
    });
};
exports.sendLoginNotification = sendLoginNotification;
