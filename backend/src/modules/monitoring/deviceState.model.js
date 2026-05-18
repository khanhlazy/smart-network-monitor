const mongoose = require('mongoose');

const deviceStateSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true, unique: true },
  status: {
    type: String,
    enum: ['online', 'offline', 'warning', 'critical', 'unknown', 'maintenance'],
    default: 'unknown',
  },
  healthScore: { type: Number, default: 0, min: 0, max: 100 },
  latencyMs: { type: Number, default: null },
  packetLossPct: { type: Number, default: 0 },
  cpuPct: { type: Number, default: null },
  memoryPct: { type: Number, default: null },
  uptimeSec: { type: Number, default: null },
  sysName: { type: String },
  snmpReachable: { type: Boolean },
  sshReachable: { type: Boolean },
  interfaces: [{
    index: { type: Number },
    name: { type: String },
    status: { type: String },
    inOctets: { type: Number },
    outOctets: { type: Number },
    inErrors: { type: Number },
    outErrors: { type: Number },
    updatedAt: { type: Date },
  }],
  consecutiveFailures: { type: Number, default: 0 },
  activeAlertCount: { type: Number, default: 0 },
  lastSeenAt: { type: Date },
  lastTelemetryAt: { type: Date },
  lastChangeAt: { type: Date },
}, { timestamps: true });

deviceStateSchema.index({ status: 1, updatedAt: -1 });
deviceStateSchema.index({ healthScore: 1 });

module.exports = mongoose.model('DeviceState', deviceStateSchema);
