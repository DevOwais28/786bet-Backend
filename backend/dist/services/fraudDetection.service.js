"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const User_1 = __importDefault(require("../models/User"));
const LoginLog_1 = __importDefault(require("../models/LoginLog"));
const email_service_1 = require("./email.service");
class FraudDetectionService {
    static RISK_FACTORS = {
        NEW_LOCATION: 30,
        NEW_DEVICE: 25,
        MULTIPLE_FAILURES: 40,
        VPN_DETECTED: 20,
        TOR_EXIT_NODE: 50,
        SUSPICIOUS_USER_AGENT: 15,
        RAPID_LOGIN_ATTEMPTS: 35,
    };
    static async checkLoginRisk(attempt) {
        let riskScore = 0;
        let reasons = [];
        // Get user's previous login locations
        const recentLogins = await LoginLog_1.default.find({
            user: attempt.userId,
            success: true,
            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }).sort({ timestamp: -1 });
        // Check for new location
        const currentLocation = geoip_lite_1.default.lookup(attempt.ip);
        const isNewLocation = this.isNewLocation(attempt.ip, recentLogins);
        if (isNewLocation) {
            riskScore += this.RISK_FACTORS.NEW_LOCATION;
            reasons.push('Login from new location');
        }
        // Check for new device
        const isNewDevice = this.isNewDevice(attempt.userAgent, recentLogins);
        if (isNewDevice) {
            riskScore += this.RISK_FACTORS.NEW_DEVICE;
            reasons.push('Login from new device');
        }
        // Check for multiple failed attempts
        const failedAttempts = await LoginLog_1.default.countDocuments({
            user: attempt.userId,
            success: false,
            timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
        });
        if (failedAttempts >= 3) {
            riskScore += this.RISK_FACTORS.MULTIPLE_FAILURES * Math.min(failedAttempts, 5);
            reasons.push(`${failedAttempts} failed login attempts`);
        }
        // Check for VPN/Tor
        if (this.isVPNDetected(attempt.ip)) {
            riskScore += this.RISK_FACTORS.VPN_DETECTED;
            reasons.push('VPN detected');
        }
        if (this.isTorExitNode(attempt.ip)) {
            riskScore += this.RISK_FACTORS.TOR_EXIT_NODE;
            reasons.push('Tor exit node detected');
        }
        // Check for suspicious user agent
        if (this.isSuspiciousUserAgent(attempt.userAgent)) {
            riskScore += this.RISK_FACTORS.SUSPICIOUS_USER_AGENT;
            reasons.push('Suspicious user agent');
        }
        // Check for rapid login attempts
        const recentAttempts = await LoginLog_1.default.countDocuments({
            user: attempt.userId,
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        });
        if (recentAttempts >= 5) {
            riskScore += this.RISK_FACTORS.RAPID_LOGIN_ATTEMPTS;
            reasons.push('Rapid login attempts');
        }
        return {
            riskScore: Math.min(riskScore, 100),
            isSuspicious: riskScore >= 50,
            reason: reasons.join(', ')
        };
    }
    static async sendSecurityAlert(attempt, riskCheck) {
        const user = await User_1.default.findById(attempt.userId);
        if (!user)
            return;
        const location = geoip_lite_1.default.lookup(attempt.ip);
        const deviceInfo = this.parseUserAgent(attempt.userAgent);
        const emailData = {
            to: user.email,
            subject: 'Security Alert: Unusual Login Attempt',
            html: `
        <h2>Security Alert</h2>
        <p>We detected an unusual login attempt to your account:</p>
        <ul>
          <li><strong>Time:</strong> ${attempt.timestamp.toLocaleString()}</li>
          <li><strong>Location:</strong> ${location?.city || 'Unknown'}, ${location?.country || 'Unknown'}</li>
          <li><strong>Device:</strong> ${deviceInfo.os} - ${deviceInfo.browser}</li>
          <li><strong>IP Address:</strong> ${attempt.ip}</li>
          <li><strong>Risk Score:</strong> ${riskCheck.riskScore}/100</li>
        </ul>
        <p>If this was not you, please secure your account immediately.</p>
      `
        };
        await (0, email_service_1.sendEmail)(emailData);
    }
    static isNewLocation(ip, recentLogins) {
        if (recentLogins.length === 0)
            return false;
        const currentLocation = geoip_lite_1.default.lookup(ip);
        if (!currentLocation)
            return true;
        const recentLocations = recentLogins.map(login => geoip_lite_1.default.lookup(login.ip)?.city || 'Unknown');
        return !recentLocations.includes(currentLocation.city);
    }
    static isNewDevice(userAgent, recentLogins) {
        const currentDevice = this.parseUserAgent(userAgent);
        return !recentLogins.some(login => {
            const device = this.parseUserAgent(login.userAgent);
            return device.browser === currentDevice.browser && device.os === currentDevice.os;
        });
    }
    static parseUserAgent(userAgent) {
        // Simple user agent parsing
        const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[1] || 'Unknown';
        const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[1] || 'Unknown';
        return { browser, os };
    }
    static isVPNDetected(ip) {
        // This would typically use a VPN detection service
        // For now, we'll use a basic check
        return false;
    }
    static isTorExitNode(ip) {
        // This would typically use a Tor exit node list
        // For now, we'll use a basic check
        return false;
    }
    static isSuspiciousUserAgent(userAgent) {
        const suspiciousPatterns = [
            /bot|crawler|spider|scraper/i,
            /curl|wget|python-requests/i,
            /headless/i
        ];
        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }
}
exports.FraudDetectionService = FraudDetectionService;
