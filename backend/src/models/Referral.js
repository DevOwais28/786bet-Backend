const { Schema, model } = require('mongoose');

const ReferralSchema = new Schema({
  referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reward: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectedReason: String
}, { timestamps: true });

ReferralSchema.index({ referrer: 1, createdAt: -1 });
ReferralSchema.index({ referee: 1 });
ReferralSchema.index({ status: 1 });

module.exports = model('Referral', ReferralSchema);
