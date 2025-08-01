const { Schema, model } = require('mongoose');

const BackupCodeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  used: { type: Boolean, default: false },
  usedAt: Date
}, { timestamps: true });

BackupCodeSchema.index({ user: 1, code: 1 });
BackupCodeSchema.index({ used: 1 });

module.exports = model('BackupCode', BackupCodeSchema);
