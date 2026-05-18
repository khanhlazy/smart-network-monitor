const mongoose = require('mongoose');

const notificationChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['email', 'telegram', 'webhook', 'slack'] },
  configEncrypted: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  severityFilter: [{ type: String, enum: ['info', 'warning', 'high', 'critical'] }],
  siteFilter: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

notificationChannelSchema.index({ type: 1, enabled: 1, deletedAt: 1 });

module.exports = mongoose.model('NotificationChannel', notificationChannelSchema);
