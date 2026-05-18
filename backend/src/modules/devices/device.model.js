const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  hostname: { type: String, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['router', 'switch', 'access_point', 'firewall', 'server', 'ip_camera', 'controller', 'other'],
  },
  vendor: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNumber: { type: String, trim: true },
  managementIp: { type: String, required: true },
  macAddress: { type: String, trim: true },
  siteId: { type: String, trim: true },
  location: {
    building: { type: String },
    floor: { type: String },
    room: { type: String },
  },
  tags: [{ type: String }],
  monitoringProfileId: { type: String },
  collectorId: { type: String },
  credentialProfileIds: [{ type: String }],
  lifecycle: {
    type: String,
    enum: ['draft', 'active', 'maintenance', 'disabled', 'retired', 'deleted'],
    default: 'active',
  },
  protocols: {
    icmp: { type: Boolean, default: true },
    snmpV2c: { type: Boolean, default: false },
    snmpV3: { type: Boolean, default: false },
    ssh: { type: Boolean, default: false },
    restApi: { type: Boolean, default: false },
  },
  protocolSettings: {
    snmp: {
      port: { type: Number, default: 161 },
      timeoutMs: { type: Number, default: 5000 },
      retries: { type: Number, default: 1 },
      credentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },
    },
    ssh: {
      port: { type: Number, default: 22 },
      timeoutMs: { type: Number, default: 10000 },
      credentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },
      profile: { type: String, enum: ['linux_server', 'network_device'], default: 'network_device' },
      allowedCommands: [{ type: String }],
    },
  },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

deviceSchema.index({ managementIp: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
deviceSchema.index({ siteId: 1, type: 1 });
deviceSchema.index({ tags: 1 });
deviceSchema.index({ name: 'text', hostname: 'text', managementIp: 'text' });

module.exports = mongoose.model('Device', deviceSchema);
