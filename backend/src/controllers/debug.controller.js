const emailService = require('../services/email.service');

const testEmailJS = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log('Testing EmailJS with:', { email, otp });
    
    const result = await emailService.sendVerificationEmail(email, otp);
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      result
    });
  } catch (error) {
    console.error('EmailJS Test Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error
    });
  }
};

module.exports = { testEmailJS };
