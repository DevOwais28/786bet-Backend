const { Schema, model } = require('mongoose');

const GameResultSchema = new Schema({
  round: { type: Number, required: true, unique: true },
  crashPoint: { type: Number, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  totalBets: { type: Number, default: 0 },
  totalWagered: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  serverSeed: { type: String, required: true },
  clientSeed: { type: String, required: true },
  nonce: { type: Number, required: true }
}, { timestamps: true });

GameResultSchema.index({ round: 1 });
GameResultSchema.index({ startTime: -1 });

module.exports = model('GameResult', GameResultSchema);
