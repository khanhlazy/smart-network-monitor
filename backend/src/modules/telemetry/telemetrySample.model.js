const mongoose = require('mongoose');

const telemetrySampleSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  siteId: { type: String },
  metric: { type: String, required: true },
  protocol: { type: String, default: 'icmp' },
  value: { type: Number, required: true },
  unit: { type: String },
  quality: { type: String, enum: ['fresh', 'stale', 'missing'], default: 'fresh' },
  collectorId: { type: String },
  sampledAt: { type: Date, default: Date.now },
}, { timestamps: true });

telemetrySampleSchema.index({ deviceId: 1, metric: 1, sampledAt: -1 });
telemetrySampleSchema.index({ siteId: 1, metric: 1, sampledAt: -1 });
// TTL index: auto-delete after 90 days
telemetrySampleSchema.index({ sampledAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('TelemetrySample', telemetrySampleSchema);
