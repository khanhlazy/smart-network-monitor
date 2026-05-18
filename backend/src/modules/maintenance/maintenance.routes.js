const express = require('express');
const router = express.Router();
const MaintenanceWindow = require('./maintenanceWindow.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

const emitMaintenance = (req, event, maintenance) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, { event, data: maintenance });
    io.emit('dashboard:summary.updated', { event: 'dashboard:summary.updated', data: { updatedAt: new Date() } });
  }
};

const updateComputedStatus = (window) => {
  if (window.status === 'cancelled') return window.status;
  const now = Date.now();
  const startsAt = new Date(window.startsAt).getTime();
  const endsAt = new Date(window.endsAt).getTime();
  if (now < startsAt) return 'scheduled';
  if (now <= endsAt) return 'active';
  return 'completed';
};

router.get('/', authorize('maintenance:read', 'maintenance.manage', '*'), async (req, res) => {
  try {
    const windows = await MaintenanceWindow.find({ deletedAt: null }).sort({ startsAt: -1 }).lean();
    res.json({ data: windows.map(item => ({ ...item, status: updateComputedStatus(item) })) });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('maintenance:manage', 'maintenance.manage', '*'), async (req, res) => {
  try {
    const { name, startsAt, endsAt } = req.body;
    if (!name || !startsAt || !endsAt) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập tên và thời gian bảo trì.' } });
    }

    const maintenance = await MaintenanceWindow.create({
      ...req.body,
      createdBy: req.user._id,
      status: updateComputedStatus(req.body),
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'maintenance.create',
      resourceType: 'maintenance_window',
      resourceId: maintenance._id.toString(),
      changes: { name, startsAt, endsAt, suppressAlerts: maintenance.suppressAlerts },
      req,
    });

    emitMaintenance(req, 'maintenance:created', maintenance);
    res.status(201).json({ data: maintenance });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.get('/:id', authorize('maintenance:read', 'maintenance.manage', '*'), async (req, res) => {
  try {
    const maintenance = await MaintenanceWindow.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!maintenance) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy lịch bảo trì.' } });
    res.json({ data: { ...maintenance, status: updateComputedStatus(maintenance) } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('maintenance:manage', 'maintenance.manage', '*'), async (req, res) => {
  try {
    const maintenance = await MaintenanceWindow.findOne({ _id: req.params.id, deletedAt: null });
    if (!maintenance) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy lịch bảo trì.' } });

    const allowed = ['name', 'description', 'scopeType', 'deviceIds', 'siteIds', 'tags', 'startsAt', 'endsAt', 'status', 'suppressAlerts'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) maintenance[field] = req.body[field];
    });
    maintenance.status = updateComputedStatus(maintenance);
    await maintenance.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'maintenance.update',
      resourceType: 'maintenance_window',
      resourceId: maintenance._id.toString(),
      changes: req.body,
      req,
    });

    emitMaintenance(req, 'maintenance:updated', maintenance);
    res.json({ data: maintenance });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('maintenance:manage', 'maintenance.manage', '*'), async (req, res) => {
  try {
    const maintenance = await MaintenanceWindow.findOne({ _id: req.params.id, deletedAt: null });
    if (!maintenance) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy lịch bảo trì.' } });

    maintenance.deletedAt = new Date();
    await maintenance.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'maintenance.delete',
      resourceType: 'maintenance_window',
      resourceId: maintenance._id.toString(),
      changes: { name: maintenance.name },
      req,
    });

    emitMaintenance(req, 'maintenance:updated', maintenance);
    res.json({ data: { message: 'Đã xóa lịch bảo trì.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
