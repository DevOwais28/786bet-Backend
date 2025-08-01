const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user','super-admin'], default: 'user' },
  balance: { type: Number, default: 0 },
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  lastLoginAt: Date,
  lastLoginIP: String,
  referralCode: { type: String, default: () => Math.random().toString(36).substring(2, 8).toUpperCase() },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerificationSentAt: Date,
  emailVerificationFailedAt: Date,
  emailVerificationAttempts: { type: Number, default: 0 },
  verificationStatus: {
    type: String,
    enum: ['pending', 'sent', 'verified', 'failed'],
    default: 'pending'
  },
  lastEmailError: String,
  emailSentCount: { type: Number, default: 0 },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
