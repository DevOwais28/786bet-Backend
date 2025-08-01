const express = require('express');
const router = express.Router();

// Simple test endpoint to verify IP tracking
router.get('/ip-test', (req, res) => {
  const clientIP = req.clientIP || req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 'unknown';

  res.json({
    success: true,
    message: 'IP tracking test endpoint',
    data: {
      clientIP,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    }
  });
});

module.exports = router;
