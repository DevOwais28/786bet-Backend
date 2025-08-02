const User = require('../models/User');
const PendingVerification = require('../models/PendingVerification');
const LoginLog = require('../models/LoginLog');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { createLogger, format, transports } = require('winston');

// Configure logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/auth-errors.log', level: 'error' }),
    new transports.File({ filename: 'logs/auth-combined.log' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});


const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    console.log('Verifying email:', email, 'with OTP:', otp);

    // Check pending verification
    const pendingVerification = await PendingVerification.findOne({
      email,
      otp,
      type: 'verification',
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (!pendingVerification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If already verified
    if (user.emailVerified) {
      await PendingVerification.deleteOne({ _id: pendingVerification._id });
      return res.json({
        success: true,
        message: 'Email already verified',
        canProceed: true
      });
    }

    // Mark user as verified
    user.emailVerified = true;
    user.verificationStatus = 'verified';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Remove pending OTP
    await PendingVerification.deleteOne({ _id: pendingVerification._id });

    console.log('Email verified successfully for:', email);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      canProceed: true
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};    



const sendVerification = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      });
    }

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Save verification token to user
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Return verification token and URL for frontend email handling
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&id=${user._id}`;

    res.json({
      success: true,
      message: 'Verification token generated for frontend email handling.',
      data: {
        verificationToken: verificationToken,
        verificationUrl: verificationUrl
      }
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    // Step 1: Find user using the token stored in DB and ensure token is not expired
    console.log('=== RESET PASSWORD DEBUG ===');
    console.log('Received token:', token);
    console.log('Token length:', token.length);

    // Handle URL-encoded tokens
    let cleanToken = token;
    try {
      // Try to decode URL-encoded token
      cleanToken = decodeURIComponent(token);
    } catch (e) {
      console.log('Token not URL encoded, using as-is');
    }

    console.log('Clean token:', cleanToken);

    // Find user with the token
    const user = await User.findOne({
      resetPasswordToken: cleanToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('=== TOKEN VALIDATION FAILED ===');

      // Debug: check all users with reset tokens
      const usersWithTokens = await User.find({
        resetPasswordToken: { $exists: true, $ne: null }
      });

      console.log('Users with reset tokens:', usersWithTokens.map(u => ({
        email: u.email,
        token: u.resetPasswordToken?.substring(0, 20) + '...',
        expires: new Date(u.resetPasswordExpires)
      })));

      // Check if token exists but expired
      const expiredUser = await User.findOne({ resetPasswordToken: cleanToken });
      if (expiredUser) {
        console.log('Token expired for user:', expiredUser.email);
        return res.status(400).json({
          success: false,
          message: 'Password reset token has expired',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid password reset token',
      });
    }

    // Step 2: Validate token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);

      // Verify the token belongs to this user
      if (decoded.userId !== user._id.toString()) {
        console.log('User ID mismatch');
        return res.status(400).json({
          success: false,
          message: 'Invalid password reset token',
        });
      }
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      });
    }

    // Step 3: Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: 'Password has been reset successfully',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate a password reset token using static secret
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store the exact token string in the database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    console.log('BEFORE SAVE - Token to store:', resetToken);
    console.log('BEFORE SAVE - User ID:', user._id);
    console.log('BEFORE SAVE - User email:', user.email);

    try {
      await user.save();
      console.log('AFTER SAVE - Token successfully stored');

      // Verify the token was actually saved
      const verifyUser = await User.findById(user._id);
      console.log('VERIFY SAVE - Stored token:', verifyUser.resetPasswordToken);
      console.log('VERIFY SAVE - Token expiration:', verifyUser.resetPasswordExpires);

    } catch (saveError) {
      console.error('ERROR saving token:', saveError);
    }

    // Return token for frontend email handling
    res.json({
      success: true,
      message: 'Password reset token generated successfully',
      data: {
        resetToken: resetToken,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`
      }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email',
      error: error.message,
    });
  }
};

const setup2FA = async (req, res) => {
  try {
    const { userId } = req.user;
    const speakeasy = require('speakeasy');

    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: `786Bet:${req.user.email}`,
      length: 20
    });

    // Save the secret to the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.twoFactorSecret = secret.base32;
    user.is2FAEnabled = false; // Will be enabled after first successful verification
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      message: 'Scan the QR code with an authenticator app and verify the code to enable 2FA'
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set up 2FA',
      error: error.message
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      twoFactorSecret: { $exists: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or 2FA not set up'
      });
    }

    // Verify the 2FA token
    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update user's refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: '2FA verification successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: '2FA verification failed',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    let user;
    const isAdminEmail = email.toLowerCase().trim() === adminEmail?.toLowerCase().trim();

    if (isAdminEmail) {
      user = await User.findOne({
        email: adminEmail.toLowerCase().trim(),
        role: 'super-admin'
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Super-admin account not found.'
        });
      }
    } else {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        debug: { emailFound: false }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const loginLog = new LoginLog({
        user: user._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        success: false,
        timestamp: new Date()
      });
      await loginLog.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        debug: { passwordValid: false }
      });
    }

    const isSuperAdmin = user.role === 'super-admin' && isAdminEmail;

    if (!isSuperAdmin && !user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        verified: false,
        userId: user._id,
        email: user.email
      });
    }

    if (isSuperAdmin && !user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    // ✅ FIXED: Set cookies for cross-origin requests
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'None', // Required for cross-origin
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'None', // Required for cross-origin
      path: '/api/auth/refresh-token', // Limit cookie to refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const isFirstLogin = !user.lastLoginAt;

    const loginLog = new LoginLog({
      user: user._id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      success: true,
      timestamp: new Date()
    });
    await loginLog.save();

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        is2FAEnabled: user.is2FAEnabled,
        lastLoginAt: user.lastLoginAt,
        isFirstLogin: isFirstLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    if (req.body.email) {
      try {
        const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
        if (user) {
          const loginLog = new LoginLog({
            user: user._id,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            success: false,
            timestamp: new Date()
          });
          await loginLog.save();
        }
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp, userId, type } = req.body;

    // Basic validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    console.log('=== VERIFICATION DEBUG ===');
    console.log('Request params:', { email, otp, type, userId });

    // Handle admin login verification
    if (type === 'admin_login') {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (email.toLowerCase().trim() !== adminEmail?.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin email'
        });
      }

      // Find admin login verification record
      const pendingVerification = await PendingVerification.findOne({
        email: email.toLowerCase().trim(),
        otp: otp.trim(),
        type: 'admin_login',
        expiresAt: { $gt: new Date() }
      });

      if (!pendingVerification) {
        console.log('Admin verification failed - no exact match found');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired admin OTP'
        });
      }

      // Find or create admin user
      let adminUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });

      if (!adminUser) {
        // Create admin user in database
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        adminUser = new User({
          username: 'admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          balance: 0,
          referralCode: 'ADMIN001',
          isEmailVerified: true,
          isActive: true
        });
        await adminUser.save();
        console.log('Admin user created in database during verification:', adminEmail);
      }

      // Delete the used verification record
      await PendingVerification.deleteOne({ _id: pendingVerification._id });

      // Generate tokens for admin
      const accessToken = jwt.sign(
        { userId: adminUser._id, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: adminUser._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Update admin's refresh token
      adminUser.refreshToken = refreshToken;
      await adminUser.save();

      // Log successful admin login
      const loginLog = new LoginLog({
        user: adminUser._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        success: true,
        timestamp: new Date()
      });
      await loginLog.save();

      return res.json({
        success: true,
        message: 'Admin login successful',
        user: {
          id: adminUser._id,
          email: adminUser.email,
          username: adminUser.username,
          role: adminUser.role,
          is2FAEnabled: adminUser.is2FAEnabled,
          lastLoginAt: adminUser.lastLoginAt
        },
        accessToken,
        refreshToken
      });
    }

    // Regular verification flow
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId is required for regular verification'
      });
    }

    // Check all verification records for this email
    const allRecords = await PendingVerification.find({
      email: email.toLowerCase().trim(),
      type: 'verification'
    });
    console.log('All verification records for email:', allRecords.length);
    allRecords.forEach(record => {
      console.log('Record:', {
        email: record.email,
        otp: record.otp,
        userId: record.userId.toString(),
        status: record.status,
        expiresAt: record.expiresAt,
        type: record.type
      });
    });

    // Find verification record by email and OTP first, then validate userId
    const pendingVerification = await PendingVerification.findOne({
      email: email.toLowerCase().trim(),
      otp: otp.trim(),
      type: 'verification',
      status: { $in: ['pending', 'resent'] },
      expiresAt: { $gt: new Date() }
    });

    // Validate userId matches after finding the record
    if (pendingVerification && pendingVerification.userId.toString() !== userId) {
      console.log('UserId mismatch:', {
        requestedUserId: userId,
        verificationUserId: pendingVerification.userId.toString(),
        email: email,
        otp: otp
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid verification parameters'
      });
    }

    console.log('Exact match found:', !!pendingVerification);
    if (pendingVerification) {
      console.log('Found record:', {
        email: pendingVerification.email,
        otp: pendingVerification.otp,
        userId: pendingVerification.userId.toString(),
        status: pendingVerification.status,
        expiresAt: pendingVerification.expiresAt
      });
    }

    if (!pendingVerification) {
      console.log('Verification failed - no exact match found');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      pendingVerification.status = 'completed';
      await pendingVerification.save();
      return res.json({
        success: true,
        message: 'Email already verified',
        verified: true
      });
    }

    // Mark user as verified
    user.emailVerified = true;
    user.verificationStatus = 'verified';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log('Email verification successful for user:', user.email);
    console.log('Updated user emailVerified status:', user.emailVerified);
    console.log('User ID:', user._id);

    // Double-check the update persisted
    const updatedUser = await User.findOne({ email });
    console.log('Double-check emailVerified in DB:', updatedUser.emailVerified);

    // Update pending verification
    pendingVerification.status = 'completed';
    await pendingVerification.save();

    console.log('OTP verification successful for user:', user.email);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      verified: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('OTP verification failed:', error);
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

const verifyAdminOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const pendingVerification = await PendingVerification.findOne({
      email,
      otp,
      type: 'admin_login',
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!pendingVerification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    pendingVerification.status = 'completed';
    await pendingVerification.save();

    return res.json({
      success: true,
      message: 'Admin OTP verified successfully'
    });

  } catch (error) {
    console.error('Admin OTP verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin OTP verification failed'
    });
  }
};

const register = async (req, res) => {
  const startTime = Date.now();

  try {
    // 1. Validate request body exists and is JSON
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format - JSON body required'
      });
    }

    // 2. Destructure with defaults and handle null values
    const { username, email, password, referralCode } = req.body;

    // Handle null/undefined values explicitly
    const normalizedEmail = (email || '').toString().toLowerCase().trim();
    const normalizedUsername = (username || '').toString().trim();
    const normalizedReferral = (referralCode || '').toString().trim();

    // 3. Enhanced validation with clear error messages
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

    if (!normalizedEmail) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(normalizedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!normalizedUsername) {
      errors.username = 'Username is required';
    } else if (!usernameRegex.test(normalizedUsername)) {
      errors.username = 'Username must be 3-20 characters (letters, numbers, underscores)';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!passwordRegex.test(password)) {
      errors.password = 'Password must be 6+ chars with uppercase, lowercase, and number';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // 4. Check for existing users in transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check existing users
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { username: normalizedUsername }
        ]
      }).session(session);

      if (existingUser) {
        const errors = {};
        if (existingUser.email === normalizedEmail) {
          errors.email = 'Email is already registered';
        }
        if (existingUser.username === normalizedUsername) {
          errors.username = 'Username is already taken';
        }

        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'User already exists',
          errors
        });
      }

      // Generate OTP for email verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Create user without email verification token (using OTP instead)
      const user = new User({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        referralCode: normalizedReferral || undefined, // Let Mongoose generate unique code
        emailVerified: false,
        verificationStatus: 'pending'
      });

      await user.save({ session });

      // Create pending verification record with OTP
      const pendingVerification = new PendingVerification({
        email: normalizedEmail,
        otp: otp,
        userId: user._id,
        type: 'verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      await pendingVerification.save({ session });

      await session.commitTransaction();

      // Return response with OTP for frontend email sending
      const responseTime = Date.now() - startTime;

      // Return response with OTP for frontend to send via EmailJS
      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: {
          userId: user._id,
          email: normalizedEmail,
          otp: otp, // Include OTP for frontend email sending
          requiresVerification: true,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error; // Will be caught by outer try-catch
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Registration Error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      ip: req.ip
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = 'This value is already taken';
      
      if (field === 'email') {
        message = 'An account with this email already exists';
      } else if (field === 'username') {
        message = 'This username is already taken';

      
      return res.status(409).json({
        success: false,
        message: message,
        field: field,
        error: 'DUPLICATE_KEY'
      });
    }

    // Default error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to server error',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  }
};
}
const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    res.json({
      success: true,
      exists: !!user
    });

  } catch (error) {
    console.error('Error in checkEmailExists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email',
      error: error.message
    });
  }
};

// Logout function
const logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Check authentication status
const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.json({
        success: false,
        message: 'No token provided',
        isAuthenticated: false
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.json({
        success: false,
        message: 'User not found',
        isAuthenticated: false
      });
    }

    res.json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
        is2FAEnabled: user.is2FAEnabled
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Invalid token',
      isAuthenticated: false
    });
  }
};

// Get email statistics (admin only)
const getEmailStats = async (req, res) => {
  try {
    // This is a placeholder for email service statistics
    // In a real implementation, this would fetch from email service logs
    res.json({
      success: true,
      stats: {
        totalEmailsSent: 0,
        verificationEmailsSent: 0,
        welcomeEmailsSent: 0,
        passwordResetEmailsSent: 0,
        last24Hours: 0
      }
    });
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email stats',
      error: error.message
    });
  }
};

// Resend verification OTP with rate limiting
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      });
    }

    // Check for rate limiting - last OTP request within 30 seconds
    const recentVerification = await PendingVerification.findOne({
      email,
      type: 'verification',
      lastAttempt: { $gt: new Date(Date.now() - 30 * 1000) }
    });

    if (recentVerification) {
      const timeLeft = Math.ceil((recentVerification.lastAttempt.getTime() + 30000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeLeft} seconds before requesting a new verification code`,
        retryAfter: timeLeft
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Find existing pending verification or create new one
    let pendingVerification = await PendingVerification.findOne({
      email,
      type: 'verification',
      userId: user._id
    });

    if (pendingVerification) {
      // Update existing verification
      pendingVerification.otp = otp;
      pendingVerification.attempts = 1;
      pendingVerification.lastAttempt = new Date();
      pendingVerification.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      pendingVerification.status = 'resent';
    } else {
      // Create new verification record
      pendingVerification = new PendingVerification({
        email: user.email,
        otp: otp,
        userId: user._id,
        type: 'verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    await pendingVerification.save();

    // Return OTP for frontend email handling - ensure exact userId from record
    const userIdString = user._id.toString();
    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      data: {
        userId: userIdString, // Exact userId from database record
        email: user.email,
        otp: otp // OTP will be sent via EmailJS from frontend
      }
    });

  } catch (error) {
    console.error('Resend verification OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: error.message
    });
  }
};

// Debug endpoint to check user credentials
const debugUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        passwordValid: isPasswordValid,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Refresh token endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update user's refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  checkAuth,
  verifyEmail,
  sendVerification,
  resendVerificationEmail,
  checkEmailExists,
  verifyAdminOTP,
  verifyOTP,
  setup2FA,
  verify2FA,
  getEmailStats,
  debugUser,
  refreshToken
};
