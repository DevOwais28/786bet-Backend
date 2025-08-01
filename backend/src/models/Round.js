const { Schema, model } = require('mongoose');

const RoundSchema = new Schema({
  roundNumber: { type: Number, unique: true, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  crashPoint: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['waiting', 'running', 'ended'], 
    default: 'waiting' 
  },
  totalBets: { type: Number, default: 0 },
  totalWagered: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 }
}, { timestamps: true });

RoundSchema.index({ roundNumber: 1 });
RoundSchema.index({ status: 1 });
RoundSchema.index({ startTime: -1 });

module.exports = model('Round', RoundSchema);
