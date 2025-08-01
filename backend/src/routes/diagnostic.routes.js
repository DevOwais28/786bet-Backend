const express = require('express');
const { emailService } = require('../services/email.service');
const { testEmailJSConfig } = require('../services/email.service');

const router = express.Router();

/**
 * Test EmailJS configuration
 */
router.post('/test-emailjs', async (req, res) => {
  try {
    const { email, templateType = 'verification' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for testing'
      });
    }

    const testResult = await testEmailJSConfig();
    
    if (testResult.success) {
      // Send test email
      const testOtp = '123456';
      await emailService.sendVerificationEmail(email, testOtp);
      
      res.json({
        success: true,
        message: 'EmailJS configuration test successful',
        testResult,
        testEmail: {
          recipient: email,
          otp: testOtp,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'EmailJS configuration test failed',
        error: testResult.error
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Configuration test error',
      error: error.message
    });
  }
});

/**
 * Get email sending statistics
 */
router.get('/email-stats', async (req, res) => {
  try {
    const stats = emailService.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get email statistics',
      error: error.message
    });
  }
});

/**
 * Get pending verifications
 */
router.get('/pending-verifications', async (req, res) => {
  try {
    const pendingVerifications = await emailService.getPendingVerifications();
    res.json({
      success: true,
      pendingVerifications,
      count: pendingVerifications.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get pending verifications',
      error: error.message
    });
  }
});

/**
 * Resend verification email (admin endpoint)
 */
router.post('/resend-verification/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await emailService.resendVerificationEmail(id);
    
    res.json({
      success: true,
      message: 'Verification email resent successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      emailService: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    };

    // Test EmailJS configuration
    const testResult = await testEmailJSConfig();
    health.emailjs = testResult.success ? 'healthy' : 'unhealthy';
    
    if (!testResult.success) {
      health.error = testResult.error;
    }

    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

module.exports = router;
