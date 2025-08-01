const mongoose = require('mongoose');

const pendingVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    enum: ['verification', 'password_reset', 'admin_login'],
    required: true
  },
  attempts: {
    type: Number,
    default: 1
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  lastAttempt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'resent', 'expired'],
    default: 'pending'
  },
  error: {
    type: String,
    required: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
});

// Index for performance
pendingVerificationSchema.index({ email: 1, type: 1 });
pendingVerificationSchema.index({ status: 1, createdAt: -1 });
pendingVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if verification is expired
pendingVerificationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if max attempts reached
pendingVerificationSchema.methods.maxAttemptsReached = function() {
  return this.attempts >= this.maxAttempts;
};

// Static method to find active verifications
pendingVerificationSchema.statics.findActive = function(email, type) {
  return this.findOne({
    email,
    type,
    status: { $in: ['pending', 'failed', 'resent'] },
    expiresAt: { $gt: new Date() }
  });
};

const PendingVerification = mongoose.model('PendingVerification', pendingVerificationSchema);

module.exports = PendingVerification;
