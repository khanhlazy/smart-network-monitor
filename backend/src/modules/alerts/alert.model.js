const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  ruleId: { type: String },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  siteId: { type: String },
  title: { type: String, required: true },
  titleVi: { type: String },
  description: { type: String },
  descriptionVi: { type: String },
  severity: {
    type: String,
    enum: ['info', 'warning', 'high', 'critical'],
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved', 'suppressed', 'escalated'],
    default: 'open',
  },
  metric: { type: String },
  currentValue: { type: Number },
  threshold: {
    operator: { type: String },
    value: { type: Number },
    durationSeconds: { type: Number },
  },
  dedupKey: { type: String },
  occurrenceCount: { type: Number, default: 1 },
  firstOccurredAt: { type: Date, default: Date.now },
  lastOccurredAt: { type: Date, default: Date.now },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNote: { type: String },
  suppressedUntil: { type: Date },
}, { timestamps: true });

alertSchema.index({ status: 1, severity: 1, lastOccurredAt: -1 });
alertSchema.index({ deviceId: 1, status: 1 });
alertSchema.index({ dedupKey: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
