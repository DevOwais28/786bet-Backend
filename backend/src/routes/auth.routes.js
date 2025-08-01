const { Router } = require('express');
const authController = require('../controllers/auth.controller');

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/check-auth', authController.checkAuth);
router.post('/verify-email', authController.verifyEmail);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/send-verification', authController.resendVerificationEmail);
router.post('/check-email', authController.checkEmailExists);
router.post('/verify-otp', authController.verifyOTP);
// router.post('/verify-email-code', authController.verifyEmailCode); // Removed - use verifyOTP instead
router.post('/verify-admin-otp', authController.verifyAdminOTP);

// Admin routes
router.get('/email-stats', authController.getEmailStats);

// Debug endpoint to check user credentials
router.post('/debug-user', authController.debugUser);

// Refresh token endpoint
router.post('/refresh-token', authController.refreshToken);

// Test endpoint to verify email service configuration
router.get('/test-email', async (req, res) => {
  try {
    const { emailService } = require('../services/email.service');
    const testResult = await emailService.testEmailJSConfig();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'Email service is properly configured',
        config: testResult.config
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email service configuration error',
        error: testResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email service configuration error',
      error: error.message
    });
  }
});

module.exports = router;
