const mongoose = require('mongoose');
const { Schema } = mongoose;

const BetSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  round: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  cashOutAt: Number,
  multiplier: Number,
  profit: Number,
  status: { 
    type: String, 
    enum: ['active', 'cashed_out', 'lost'], 
    default: 'active' 
  }
}, { timestamps: true });

// Indexes for performance
BetSchema.index({ user: 1, createdAt: -1 });
BetSchema.index({ round: 1 });
BetSchema.index({ status: 1 });

module.exports = mongoose.models.Bet || mongoose.model('Bet', BetSchema);
