const { Schema, model } = require('mongoose');

const LoginLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, default: false },
  location: {
    country: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number
  }
}, { timestamps: true });

LoginLogSchema.index({ user: 1, timestamp: -1 });
LoginLogSchema.index({ ip: 1, timestamp: -1 });

module.exports = model('LoginLog', LoginLogSchema);
