const LoginLog = require('../models/LoginLog.js');
const User = require('../models/User.js');

class FraudDetectionService {
  async checkSuspiciousLogin(userId, ip, userAgent) {
    try {
      const user = await User.findById(userId);
      if (!user) return { isSuspicious: false };

      // Check for rapid login attempts
      const recentLogins = await LoginLog.find({
        user: userId,
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (recentLogins.length >= 5) {
        return { 
          isSuspicious: true, 
          reason: 'Too many login attempts in short time' 
        };
      }

      // Check for new device/location
      const previousLogins = await LoginLog.find({
        user: userId,
        success: true,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).sort({ timestamp: -1 });

      if (previousLogins.length > 0) {
        const lastLogin = previousLogins[0];
        
        // Check if IP changed
        if (lastLogin.ip !== ip) {
          // Check if IP is from different country (simplified)
          const isSameCountry = this.isSameCountry(lastLogin.ip, ip);
          if (!isSameCountry) {
            return { 
              isSuspicious: true, 
              reason: 'Login from different country' 
            };
          }
        }

        // Check if device changed
        if (lastLogin.userAgent !== userAgent) {
          return { 
            isSuspicious: true, 
            reason: 'Login from new device/browser' 
          };
        }
      }

      return { isSuspicious: false };
    } catch (error) {
      console.error('Fraud detection error:', error);
      return { isSuspicious: false };
    }
  }

  async checkSuspiciousTransaction(userId, amount, method) {
    try {
      const user = await User.findById(userId);
      if (!user) return { isSuspicious: false };

      // Check for unusually large transactions
      const userBalance = user.balance;
      if (amount > userBalance * 10) {
        return { 
          isSuspicious: true, 
          reason: 'Transaction amount unusually large' 
        };
      }

      // Check for rapid transactions
      const recentTransactions = await Transaction.find({
        user: userId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });

      if (recentTransactions.length >= 10) {
        return { 
          isSuspicious: true, 
          reason: 'Too many transactions in short time' 
        };
      }

      return { isSuspicious: false };
    } catch (error) {
      console.error('Transaction fraud check error:', error);
      return { isSuspicious: false };
    }
  }

  isSameCountry(ip1, ip2) {
    // Simplified IP country check - in real implementation use IP geolocation service
    const isPrivateIP = (ip) => {
      return ip.startsWith('192.168.') || 
             ip.startsWith('10.') || 
             ip.startsWith('172.16.') || 
             ip.startsWith('127.');
    };

    // For now, consider all private IPs as same country
    if (isPrivateIP(ip1) && isPrivateIP(ip2)) return true;
    
    // For public IPs, return true (simplified)
    return true;
  }
}

module.exports = { FraudDetectionService };
