const mongoose = require('mongoose');

const topologyLinkSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  sourceDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  targetDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  sourceInterface: { type: String },
  targetInterface: { type: String },
  label: { type: String },
  type: { type: String, enum: ['uplink', 'peer', 'downlink', 'default'], default: 'default' },
  linkType: { type: String, enum: ['uplink', 'peer', 'downlink', 'wan', 'lan', 'default'], default: 'default' },
  bandwidthMbps: { type: Number },
  status: { type: String, enum: ['active', 'down', 'degraded', 'unknown'], default: 'unknown' },
  siteId: { type: String },
  animated: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Prevent duplicate links between same devices in same direction
topologyLinkSchema.pre('validate', function(next) {
  if (!this.sourceId && this.sourceDeviceId) this.sourceId = this.sourceDeviceId;
  if (!this.targetId && this.targetDeviceId) this.targetId = this.targetDeviceId;
  if (!this.sourceDeviceId && this.sourceId) this.sourceDeviceId = this.sourceId;
  if (!this.targetDeviceId && this.targetId) this.targetDeviceId = this.targetId;
  if (!this.linkType && this.type) this.linkType = this.type;
  if (!this.type && this.linkType) this.type = this.linkType;
  next();
});

topologyLinkSchema.index(
  { sourceDeviceId: 1, targetDeviceId: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
topologyLinkSchema.index({ siteId: 1, status: 1, deletedAt: 1 });

module.exports = mongoose.model('TopologyLink', topologyLinkSchema);
