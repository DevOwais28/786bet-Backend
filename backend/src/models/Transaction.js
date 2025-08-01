const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);

// Encryption helper - ensure always returns string
const encrypt = (text) => {
  if (!text || typeof text !== 'string') return String(text || '');
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return String(iv.toString('hex') + ':' + encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    return String(text); // Always return string
  }
};

// Decryption helper - ensure always returns string
const decrypt = (text) => {
  if (!text || typeof text !== 'string' || !text.includes(':')) return String(text || '');
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return String(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return String(text); // Always return string
  }
};

const TransactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  method: { 
    type: String, 
    enum: ['jazzcash', 'easypaisa', 'usdt', 'usdt_trx', 'bank_transfer'], 
    required: true 
  },
  network: { 
    type: String, 
    enum: ['TRX', 'BSC', 'ETH', 'SOL', null],
    default: null
  },
  amount: { 
    type: Number, 
    required: true, 
    min: [10, 'Minimum amount is 10'],
    set: v => parseFloat(v.toFixed(2))
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  // Deposit/Withdrawal specific fields
  screenshot: String,
  proofImage: String,
  paymentProof: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedAt: Date,
  rejectedReason: String,
  walletAddress: {
    type: String,
    required: function() {
      // Only required for withdrawal transactions
      return this.type === 'withdrawal';
    }
  },
  // Payment details for deposits (QR code, address, etc.)
  paymentDetails: {
    type: Map,
    of: Schema.Types.Mixed
  },
  // Additional metadata
  transactionId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  // System fields
  ipAddress: String,
  userAgent: String,
  // Additional metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  // Timestamps for different status changes
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Generate unique transaction ID
TransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
