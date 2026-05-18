const mongoose = require('mongoose');

const maintenanceWindowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  scopeType: { type: String, enum: ['device', 'site', 'tag', 'all'], default: 'device' },
  deviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
  siteIds: [{ type: String }],
  tags: [{ type: String }],
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  suppressAlerts: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

maintenanceWindowSchema.index({ startsAt: 1, endsAt: 1, deletedAt: 1 });
maintenanceWindowSchema.index({ deviceIds: 1, deletedAt: 1 });
maintenanceWindowSchema.index({ siteIds: 1, deletedAt: 1 });

module.exports = mongoose.model('MaintenanceWindow', maintenanceWindowSchema);
