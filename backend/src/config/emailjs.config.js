require('dotenv').config();

const requiredVars = [
  'EMAILJS_SERVICE_ID',
  'EMAILJS_TEMPLATE_ID_VERIFICATION',
  'EMAILJS_TEMPLATE_ID_ADMIN_LOGIN',
  'EMAILJS_TEMPLATE_ID_PASSWORD_RESET',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required EmailJS environment variables:', missingVars.join(', '));
  console.warn('Some email functionality may not work properly');
}

module.exports = {
  serviceId: process.env.EMAILJS_SERVICE_ID,
  templates: {
    // Authentication templates
    verification: process.env.EMAILJS_TEMPLATE_ID_VERIFICATION,
    adminLogin: process.env.EMAILJS_TEMPLATE_ID_ADMIN_LOGIN,
    passwordReset: process.env.EMAILJS_TEMPLATE_ID_PASSWORD_RESET,
    
    // Notification templates (fallback to default if not specified)
    loginNotification: process.env.EMAILJS_TEMPLATE_ID_LOGIN_NOTIFICATION || 'default_login_notification',
    transactionNotification: process.env.EMAILJS_TEMPLATE_ID_TRANSACTION_NOTIFICATION || 'default_transaction_notification',
    welcome: process.env.EMAILJS_TEMPLATE_ID_WELCOME || 'default_welcome'
  },
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
};
