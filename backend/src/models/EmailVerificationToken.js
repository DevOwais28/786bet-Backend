const mongoose = require('mongoose');

const emailVerificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Not required for pending registrations
  },
  email: {
    type: String,
    required: false,
    sparse: true, // Allow null but enforce uniqueness
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

// Index for automatic cleanup
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
