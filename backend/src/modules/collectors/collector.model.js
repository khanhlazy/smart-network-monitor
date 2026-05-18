const mongoose = require('mongoose');

const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  siteId: { type: String },
  version: { type: String, default: '1.0.0' },
  status: { type: String, enum: ['online', 'offline', 'degraded'], default: 'online' },
  lastHeartbeatAt: { type: Date },
  assignedDeviceCount: { type: Number, default: 0 },
  health: {
    cpuPct: { type: Number },
    memoryPct: { type: Number },
    queueLagMs: { type: Number },
    pollSuccessRate: { type: Number },
  },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

collectorSchema.index({ status: 1 });
collectorSchema.index({ lastHeartbeatAt: 1 });

module.exports = mongoose.model('Collector', collectorSchema);
