const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['snmp_v2c', 'snmp_v3', 'ssh_password', 'ssh_private_key', 'webhook', 'email', 'telegram', 'slack', 'mfa'],
  },
  encryptedPayload: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

credentialSchema.index({ type: 1, deletedAt: 1 });
credentialSchema.index({ name: 1, deletedAt: 1 });

module.exports = mongoose.model('Credential', credentialSchema);
