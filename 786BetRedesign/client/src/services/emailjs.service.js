import emailjs from '@emailjs/browser';

// EmailJS configuration - these should be environment variables
const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  UniveraltemplateId: import.meta.env.VITE_EMAILJS_UNIVERSAL_TEMPLATE_ID, // Single universal template
  WelcometemplateId:import.meta.env.VITE_EMAILJS_TEMPLATE_ID_WELCOME
}
// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

class EmailJSService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async sendWithRetry(templateId, params, attempt = 1) {
    try {
      const result = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        templateId,
        params,
        EMAILJS_CONFIG.publicKey
      );

      if (result.status !== 200) {
        throw new Error(`Status ${result.status}`);
      }

      return { success: true, result };
    } catch (error) {
      if (attempt < this.maxRetries) {
        console.warn(`Email send attempt ${attempt} failed, retrying...`, error);
        await this.delay(this.retryDelay * attempt);
        return this.sendWithRetry(templateId, params, attempt + 1);
      }
      throw error;
    }
  }

  // ✅ Send verification email
  async sendVerificationEmail(email, username = 'User', otp, userId = null) {
    if (!this.isValidEmail(email)) throw new Error(`Invalid email: ${email}`);

    const params = {
      email,
      username,
      subject: 'Verify Your Email - 786Bet',
      message: 'Please use the following OTP to verify your email address.',
      otp: otp.toString(),
      time: '15 minutes',
      timelimit:'OTP is valid up to ',
      link: '',
      link_text: ''
    };

    try {
      const result = await this.sendWithRetry(
        EMAILJS_CONFIG.UniveraltemplateId,
        params
      );
      console.log('Verification email sent:', { email, userId });
      return result;
    } catch (error) {
      console.error('Verification email failed:', { email, error });
      throw error;
    }
  }

  // ✅ Welcome email (unchanged)
  async sendWelcomeEmail(email, name) {
    if (!this.isValidEmail(email)) throw new Error(`Invalid email: ${email}`);

    const params = {
      email,
      name: name || 'User'
    };

    try {
      const result = await this.sendWithRetry(
        EMAILJS_CONFIG.WelcometemplateId,
        params
      );
      console.log('Welcome email sent:', { email, name });
      return result;
    } catch (error) {
      console.error('Welcome email failed:', { email, error });
      throw error;
    }
  }

  // ✅ Password reset email
  async sendPasswordResetEmail(email, resetToken, username = 'User') {
    if (!this.isValidEmail(email)) throw new Error(`Invalid email: ${email}`);

    const resetUrl = `${window.location.origin}/reset-password/${resetToken}`;

    const params = {
      email,
      username,
      subject: 'Reset Your Password - 786Bet',
      message: 'Click the link below to reset your password.',
      otp: '',
      time: '',
      timelimit:'',
      link: resetUrl,
      link_text: 'Reset Your Password'
    };

    try {
      const result = await this.sendWithRetry(
        EMAILJS_CONFIG.UniveraltemplateId,
        params
      );
      console.log('Password reset email sent:', { email });
      return result;
    } catch (error) {
      console.error('Password reset email failed:', { email, error });
      throw error;
    }
  }

  // ✅ Admin OTP
  async sendAdminLoginOTP(email, otp, username = 'Admin', userId = null) {
    if (!this.isValidEmail(email)) throw new Error(`Invalid email: ${email}`);

    const params = {
      email,
      username,
      subject: 'Admin Login OTP - 786Bet',
      message: 'Use this OTP to proceed with admin-level operations.',
      otp,
      time: '5 minutes',
     timelimit:'it s valid upto ',
      link: '',
      link_text: ''
    };

    try {
      const result = await this.sendWithRetry(
        EMAILJS_CONFIG.UniveraltemplateId,
        params
      );
      console.log('Admin OTP sent:', { email, userId });
      return result;
    } catch (error) {
      console.error('Admin OTP failed:', { email, error });
      throw error;
    }
  }
}


// Create singleton instance
const emailJSService = new EmailJSService();

export default emailJSService;
