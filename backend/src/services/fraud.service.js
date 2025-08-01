const User = require('../models/User.js');
const LoginLog = require('../models/LoginLog.js');
const Transaction = require('../models/Transaction.js');

class FraudService {
  async detectSuspiciousLogin(userId, ip, userAgent) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Check for rapid login attempts
      const recentLogins = await LoginLog.find({
        user: userId,
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (recentLogins.length >= 5) {
        return {
          isSuspicious: true,
          reason: 'Too many login attempts in short time',
          severity: 'high'
        };
      }

      // Check for new device/location
      const previousLogins = await LoginLog.find({
        user: userId,
        success: true,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).sort({ timestamp: -1 });

      if (previousLogins.length > 0) {
        const lastLogin = previousLogins[0];
        
        if (lastLogin.ip !== ip) {
          return {
            isSuspicious: true,
            reason: 'Login from new IP address',
            severity: 'medium'
          };
        }

        if (lastLogin.userAgent !== userAgent) {
          return {
            isSuspicious: true,
            reason: 'Login from new device/browser',
            severity: 'medium'
          };
        }
      }

      return { isSuspicious: false };
    } catch (error) {
      console.error('Fraud detection error:', error);
      return { isSuspicious: false };
    }
  }

  async detectSuspiciousTransaction(userId, amount, method) {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Check for unusually large transactions
      const userBalance = user.balance;
      if (amount > userBalance * 5) {
        return {
          isSuspicious: true,
          reason: 'Transaction amount unusually large',
          severity: 'high'
        };
      }

      // Check for rapid transactions
      const recentTransactions = await Transaction.find({
        user: userId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });

      if (recentTransactions.length >= 10) {
        return {
          isSuspicious: true,
          reason: 'Too many transactions in short time',
          severity: 'medium'
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      console.error('Transaction fraud check error:', error);
      return { isSuspicious: false };
    }
  }

  async getUserRiskScore(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return 0;

      let riskScore = 0;

      // Check login patterns
      const loginLogs = await LoginLog.find({ user: userId });
      const uniqueIPs = new Set(loginLogs.map(log => log.ip));
      const uniqueDevices = new Set(loginLogs.map(log => log.userAgent));

      if (uniqueIPs.size > 5) riskScore += 10;
      if (uniqueDevices.size > 3) riskScore += 5;

      // Check transaction patterns
      const transactions = await Transaction.find({ user: userId });
      const totalTransactions = transactions.length;
      const failedTransactions = transactions.filter(t => t.status === 'failed').length;

      if (totalTransactions > 0) {
        const failureRate = failedTransactions / totalTransactions;
        if (failureRate > 0.3) riskScore += 15;
      }

      return Math.min(riskScore, 100);
    } catch (error) {
      console.error('Risk score calculation error:', error);
      return 0;
    }
  }
}

module.exports = { FraudService };
