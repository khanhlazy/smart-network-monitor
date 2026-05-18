const mongoose = require('mongoose');

const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  siteId: { type: String },
  // API key for authentication from remote collector agents
  apiKey: { type: String, unique: true, sparse: true },
  version: { type: String, default: '1.0.0' },
  status: { type: String, enum: ['online', 'offline', 'degraded'], default: 'online' },
  lastHeartbeatAt: { type: Date },
  assignedDeviceCount: { type: Number, default: 0 },
  // Network info of the collector node
  network: {
    publicIp: { type: String },
    localIp: { type: String },
    hostname: { type: String },
  },
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
collectorSchema.index({ apiKey: 1 });

module.exports = mongoose.model('Collector', collectorSchema);
