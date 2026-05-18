const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['uptime', 'device_offline', 'alert', 'incident', 'sla', 'traffic', 'collector_health'],
  },
  format: { type: String, required: true, enum: ['pdf', 'excel', 'csv'] },
  params: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'generating', 'completed', 'failed'], default: 'pending' },
  filePath: { type: String },
  storageKey: { type: String },
  errorMessage: { type: String },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedAt: { type: Date },
  expiresAt: { type: Date },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Report', reportSchema);
