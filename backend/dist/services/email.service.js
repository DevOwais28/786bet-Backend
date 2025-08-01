"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginNotification = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendEmail = async (options) => {
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    }
    catch (error) {
        console.error('Email sending failed:', error);
        // Log to monitoring service or queue for retry
    }
};
exports.sendEmail = sendEmail;
const sendLoginNotification = async (email, ip, userAgent, timestamp) => {
    const geoip = require('geoip-lite');
    const location = geoip.lookup(ip);
    const deviceInfo = parseUserAgent(userAgent);
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Login Notification</h2>
      <p>Hello,</p>
      <p>We detected a login to your account:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Login Details</h3>
        <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        <p><strong>Location:</strong> ${location?.city || 'Unknown'}, ${location?.country || 'Unknown'}</p>
        <p><strong>Device:</strong> ${deviceInfo.os} - ${deviceInfo.browser}</p>
        <p><strong>IP Address:</strong> ${ip}</p>
      </div>
      
      <p>If this was you, no action is needed. If this wasn't you, please:</p>
      <ul>
        <li>Change your password immediately</li>
        <li>Review your account for any unauthorized activity</li>
        <li>Contact support if you need assistance</li>
      </ul>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;
    await (0, exports.sendEmail)({
        to: email,
        subject: 'New Login Detected - 786Bet',
        html,
    });
};
exports.sendLoginNotification = sendLoginNotification;
const parseUserAgent = (userAgent) => {
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[1] || 'Unknown';
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[1] || 'Unknown';
    return { browser, os };
};
