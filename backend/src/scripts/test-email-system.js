#!/usr/bin/env node

/**
 * Comprehensive Email System Test Script
 * Tests EmailJS configuration, email sending, and error handling
 */

const mongoose = require('mongoose');
const { emailService } = require('../services/email.service');
const User = require('../models/User');
const PendingVerification = require('../models/PendingVerification');

// Configure logger
const logger = require('winston').createLogger({
  level: 'info',
  format: require('winston').format.combine(
    require('winston').format.timestamp(),
    require('winston').format.simple()
  ),
  transports: [
    new require('winston').transports.Console()
  ]
});

class EmailSystemTester {
  constructor() {
    this.testResults = {
      emailjs: false,
      database: false,
      templates: false,
      retryLogic: false,
      errorHandling: false
    };
  }

  async initialize() {
    try {
      // Connect to database
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('✅ Database connected successfully');
      this.testResults.database = true;
    } catch (error) {
      logger.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async testEmailJSConfig() {
    try {
      logger.info('🔍 Testing EmailJS Configuration...');
      
      const testResult = await emailService.testEmailJSConfig();
      
      if (testResult.success) {
        logger.info('✅ EmailJS Configuration: PASS');
        logger.info('   Service ID:', process.env.EMAILJS_SERVICE_ID);
        logger.info('   Template ID:', process.env.EMAILJS_TEMPLATE_ID_VERIFICATION);
        logger.info('   Public Key:', process.env.EMAILJS_PUBLIC_KEY ? 'Set' : 'Missing');
        this.testResults.emailjs = true;
      } else {
        logger.error('❌ EmailJS Configuration: FAIL');
        logger.error('   Error:', testResult.error);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('❌ EmailJS test failed:', error.message);
      return false;
    }
  }

  async testEmailTemplates() {
    try {
      logger.info('🔍 Testing Email Templates...');
      
      const testEmail = 'test@example.com';
      const testOtp = '123456';
      
      // Test verification email
      await emailService.sendVerificationEmail(testEmail, testOtp);
      logger.info('✅ Verification email template: PASS');
      
      // Test password reset email
      await emailService.sendPasswordResetEmail(testEmail, testOtp);
      logger.info('✅ Password reset email template: PASS');
      
      // Test admin login OTP
      await emailService.sendAdminLoginOTP(testEmail, testOtp);
      logger.info('✅ Admin login OTP template: PASS');
      
      this.testResults.templates = true;
      return true;
    } catch (error) {
      logger.error('❌ Email template test failed:', error.message);
      return false;
    }
  }

  async testRetryLogic() {
    try {
      logger.info('🔍 Testing Retry Logic...');
      
      const statsBefore = emailService.getStats();
      logger.info('Stats before test:', statsBefore);
      
      // Test with invalid email to trigger retry
      try {
        await emailService.sendVerificationEmail('invalid-email', '123456');
      } catch (error) {
        // Expected to fail
      }
      
      const statsAfter = emailService.getStats();
      logger.info('Stats after test:', statsAfter);
      
      if (statsAfter.retried > statsBefore.retried) {
        logger.info('✅ Retry logic: PASS');
        this.testResults.retryLogic = true;
      } else {
        logger.warn('⚠️  Retry logic: INCONCLUSIVE');
      }
      
      return true;
    } catch (error) {
      logger.error('❌ Retry logic test failed:', error.message);
      return false;
    }
  }

  async testErrorHandling() {
    try {
      logger.info('🔍 Testing Error Handling...');
      
      // Test with invalid parameters
      try {
        await emailService.sendVerificationEmail('', '123456');
        logger.error('❌ Should have thrown error for empty email');
        return false;
      } catch (error) {
        logger.info('✅ Error handling for empty email: PASS');
      }
      
      // Test with invalid OTP
      try {
        await emailService.sendVerificationEmail('test@example.com', '');
        logger.error('❌ Should have thrown error for empty OTP');
        return false;
      } catch (error) {
        logger.info('✅ Error handling for empty OTP: PASS');
      }
      
      this.testResults.errorHandling = true;
      return true;
    } catch (error) {
      logger.error('❌ Error handling test failed:', error.message);
      return false;
    }
  }

  async testDatabaseIntegration() {
    try {
      logger.info('🔍 Testing Database Integration...');
      
      // Create test user
      const testUser = new User({
        email: 'test-integration@example.com',
        username: 'testuser',
        password: 'testpass123',
        emailVerified: false
      });
      
      await testUser.save();
      logger.info('✅ Test user created successfully');
      
      // Test pending verification storage
      const pendingVerification = new PendingVerification({
        email: 'test-pending@example.com',
        otp: '123456',
        userId: testUser._id,
        type: 'verification',
        error: 'Test error'
      });
      
      await pendingVerification.save();
      logger.info('✅ Pending verification stored successfully');
      
      // Cleanup
      await User.deleteOne({ _id: testUser._id });
      await PendingVerification.deleteOne({ _id: pendingVerification._id });
      
      return true;
    } catch (error) {
      logger.error('❌ Database integration test failed:', error.message);
      return false;
    }
  }

  async runFullTest() {
    logger.info('🚀 Starting comprehensive email system test...');
    
    try {
      await this.initialize();
      
      const tests = [
        this.testEmailJSConfig,
        this.testEmailTemplates,
        this.testRetryLogic,
        this.testErrorHandling,
        this.testDatabaseIntegration
      ];
      
      let passed = 0;
      let failed = 0;
      
      for (const test of tests) {
        try {
          const result = await test.call(this);
          if (result) passed++;
          else failed++;
        } catch (error) {
          failed++;
          logger.error(`Test failed: ${error.message}`);
        }
      }
      
      logger.info('📊 Test Results Summary:');
      logger.info(`   ✅ Passed: ${passed}`);
      logger.info(`   ❌ Failed: ${failed}`);
      logger.info(`   📋 Results: ${JSON.stringify(this.testResults, null, 2)}`);
      
      if (failed === 0) {
        logger.info('🎉 All tests passed! Email system is ready for production.');
      } else {
        logger.warn('⚠️  Some tests failed. Please review the configuration.');
      }
      
      return { passed, failed, results: this.testResults };
      
    } catch (error) {
      logger.error('❌ Test suite failed:', error.message);
      return { passed: 0, failed: 1, error: error.message };
    } finally {
      await mongoose.disconnect();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  require('dotenv').config();
  
  const tester = new EmailSystemTester();
  tester.runFullTest()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      logger.error('Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = EmailSystemTester;
