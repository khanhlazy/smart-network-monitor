const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameVi: { type: String },
  metric: { type: String, required: true },
  operator: { type: String, enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'], required: true },
  threshold: { type: Number, required: true },
  durationSeconds: { type: Number, default: 0 },
  consecutiveViolations: { type: Number, default: 1 },
  severity: { type: String, enum: ['info', 'warning', 'high', 'critical'], required: true },
  scope: {
    siteIds: [{ type: String }],
    deviceTypes: [{ type: String }],
    tags: [{ type: String }],
  },
  enabled: { type: Boolean, default: true },
  autoCreateIncident: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('AlertRule', alertRuleSchema);
