const mongoose = require('mongoose');

const anomalyEventSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  metric: { type: String, required: true },
  currentValue: { type: Number, required: true },
  baselineValue: { type: Number, required: true },
  anomalyScore: { type: Number, required: true },
  model: { type: String, enum: ['rolling_zscore', 'mad'], default: 'rolling_zscore' },
  severity: { type: String, enum: ['info', 'warning', 'high', 'critical'], default: 'warning' },
  explanation: { type: String },
}, { timestamps: true });

anomalyEventSchema.index({ deviceId: 1, metric: 1, createdAt: -1 });
anomalyEventSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('AnomalyEvent', anomalyEventSchema);
