const express = require('express');
const { ipTracker } = require('../middleware/ipTracker.middleware');
const router = express.Router();

// Get IP tracking statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = ipTracker.getIPStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving IP stats',
      error: error.message
    });
  }
});

// Get specific IP details
router.get('/ip/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const stats = ipTracker.getIPStats(ip);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving IP details',
      error: error.message
    });
  }
});

// Block an IP address
router.post('/block', async (req, res) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    ipTracker.blockIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      data: { ip, reason: reason || 'manual_block' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error blocking IP',
      error: error.message
    });
  }
});

// Get blocked IPs
router.get('/blocked', async (req, res) => {
  try {
    const blockedIPs = Array.from(ipTracker.blockedIPs);
    res.json({
      success: true,
      data: blockedIPs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving blocked IPs',
      error: error.message
    });
  }
});

// Get recent IP activity
router.get('/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = ipTracker.readLogs();
    const recent = logs.slice(-parseInt(limit));
    
    res.json({
      success: true,
      data: recent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving recent activity',
      error: error.message
    });
  }
});

// Unblock an IP address
router.post('/unblock', async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    ipTracker.blockedIPs.delete(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unblocking IP',
      error: error.message
    });
  }
});

// Get current user's IP info
router.get('/current', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 
                    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
                    req.connection.socket?.remoteAddress;

    if (!clientIP) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine client IP address'
      });
    }

    const ipInfo = ipTracker.getIPStats(clientIP);
    
    res.json({
      success: true,
      data: {
        ip: clientIP,
        location: ipInfo.location || 'Unknown',
        country: ipInfo.country || 'Unknown',
        region: ipInfo.region || 'Unknown',
        city: ipInfo.city || 'Unknown',
        isp: ipInfo.isp || 'Unknown',
        timestamp: new Date().toISOString(),
        isBlocked: ipInfo.isBlocked || false,
        riskLevel: ipInfo.riskLevel || 'low'
      }
    });
  } catch (error) {
    console.error('Current IP info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current IP info',
      error: error.message
    });
  }
});

module.exports = router;
