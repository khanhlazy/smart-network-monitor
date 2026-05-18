const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  body: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const timelineSchema = new mongoose.Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  severity: { type: String, enum: ['info', 'warning', 'high', 'critical'], default: 'warning' },
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'closed'], default: 'open' },
  relatedAlertIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }],
  relatedDeviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [commentSchema],
  timeline: [timelineSchema],
  rootCause: { type: String },
  resolution: { type: String },
  firstSeenAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

incidentSchema.index({ status: 1, severity: 1, updatedAt: -1 });
incidentSchema.index({ relatedDeviceIds: 1, status: 1 });
incidentSchema.index({ relatedAlertIds: 1 });
incidentSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
