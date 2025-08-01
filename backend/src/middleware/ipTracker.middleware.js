const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class IPTracker {
  constructor() {
    this.logFile = path.join(logsDir, 'ip-tracker.log');
    this.blockedIPs = new Set();
    this.rateLimitMap = new Map();
  }

  // Get client IP address
  getClientIP(req) {
    let ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Handle x-forwarded-for format (client, proxy1, proxy2)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Remove IPv6 prefix if present
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    return ip || 'unknown';
  }

  // Log IP access
  logIPAccess(req, userId = null) {
    const ip = this.getClientIP(req);
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || req.headers['referrer'] || 'direct';

    const logEntry = {
      timestamp,
      ip,
      method,
      url,
      userAgent,
      referer,
      userId: userId || 'anonymous',
      country: this.getCountryFromIP(ip)
    };

    // Write to log file
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');

    return logEntry;
  }

  // Get country from IP (basic implementation)
  getCountryFromIP(ip) {
    // This is a placeholder - in production, use a proper IP geolocation service
    const reservedIPs = {
      '127.0.0.1': 'localhost',
      '::1': 'localhost',
      '192.168.': 'private',
      '10.': 'private',
      '172.16.': 'private',
      '172.17.': 'private',
      '172.18.': 'private',
      '172.19.': 'private',
      '172.20.': 'private',
      '172.21.': 'private',
      '172.22.': 'private',
      '172.23.': 'private',
      '172.24.': 'private',
      '172.25.': 'private',
      '172.26.': 'private',
      '172.27.': 'private',
      '172.28.': 'private',
      '172.29.': 'private',
      '172.30.': 'private',
      '172.31.': 'private'
    };

    for (const [prefix, country] of Object.entries(reservedIPs)) {
      if (ip.startsWith(prefix)) {
        return country;
      }
    }

    return 'unknown';
  }

  // Rate limiting
  checkRateLimit(ip, limit = 100, windowMs = 60000) {
    const key = ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, []);
    }

    const requests = this.rateLimitMap.get(key);
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= limit) {
      return false; // Rate limit exceeded
    }

    recentRequests.push(now);
    this.rateLimitMap.set(key, recentRequests);
    return true;
  }

  // Check if IP is blocked
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // Block IP
  blockIP(ip) {
    this.blockedIPs.add(ip);
    
    // Log blocked IP
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip,
      action: 'blocked',
      reason: 'suspicious_activity'
    };
    
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  // Get IP statistics
  getIPStats(ip = null) {
    const logs = this.readLogs();
    const stats = {
      totalRequests: logs.length,
      uniqueIPs: new Set(logs.map(log => log.ip)).size,
      topIPs: {},
      topEndpoints: {},
      hourlyActivity: {},
      dailyActivity: {}
    };

    logs.forEach(log => {
      // Count top IPs
      stats.topIPs[log.ip] = (stats.topIPs[log.ip] || 0) + 1;
      
      // Count top endpoints
      stats.topEndpoints[log.url] = (stats.topEndpoints[log.url] || 0) + 1;
      
      // Hourly activity
      const hour = new Date(log.timestamp).getHours();
      stats.hourlyActivity[hour] = (stats.hourlyActivity[hour] || 0) + 1;
      
      // Daily activity
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      stats.dailyActivity[day] = (stats.dailyActivity[day] || 0) + 1;
    });

    // Sort top IPs and endpoints
    stats.topIPs = Object.entries(stats.topIPs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    stats.topEndpoints = Object.entries(stats.topEndpoints)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (ip) {
      return {
        ...stats,
        ipSpecific: logs.filter(log => log.ip === ip)
      };
    }

    return stats;
  }

  // Read logs from file
  readLogs() {
    try {
      const logs = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      return logs;
    } catch (error) {
      return [];
    }
  }

  // Middleware factory
  createMiddleware(options = {}) {
    const {
      logRequests = true,
      rateLimit = true,
      blockSuspicious = false,
      excludeRoutes = [],
      includeUserId = false
    } = options;

    return (req, res, next) => {
      const ip = this.getClientIP(req);
      
      // Skip excluded routes
      if (excludeRoutes.some(route => req.path.includes(route))) {
        return next();
      }

      // Check if IP is blocked
      if (this.isBlocked(ip)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Rate limiting
      if (rateLimit && !this.checkRateLimit(ip)) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests'
        });
      }

      // Log IP access
      if (logRequests) {
        const userId = includeUserId && req.user ? req.user.id : null;
        this.logIPAccess(req, userId);
      }

      // Add IP info to request
      req.clientIP = ip;
      req.ipInfo = {
        ip,
        country: this.getCountryFromIP(ip),
        userAgent: req.headers['user-agent']
      };

      next();
    };
  }
}

const ipTracker = new IPTracker();

module.exports = {
  IPTracker,
  ipTracker
};
