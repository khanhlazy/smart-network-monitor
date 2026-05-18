const express = require('express');
const router = express.Router();
const Incident = require('./incident.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

const emitIncident = (req, event, incident) => {
  const io = req.app.get('io');
  if (io) io.emit(event, { event, data: incident });
};

const addTimeline = (incident, type, message, req) => {
  incident.timeline.push({
    type,
    message,
    actorUserId: req.user._id,
    actorName: req.user.fullName,
  });
};

router.get('/', authorize('incident:read', 'incidents.read', '*'), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, status, severity, sort = '-updatedAt' } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('assignedTo', 'fullName email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      Incident.countDocuments(filter),
    ]);

    res.json({
      data: incidents,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('incident:create', 'incidents.create', '*'), async (req, res) => {
  try {
    const { title, description, severity, relatedAlertIds, relatedDeviceIds } = req.body;
    if (!title) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập tiêu đề sự cố.' } });

    const incident = await Incident.create({
      title,
      description,
      severity,
      relatedAlertIds: relatedAlertIds || [],
      relatedDeviceIds: relatedDeviceIds || [],
      createdBy: req.user._id,
      timeline: [{
        type: 'created',
        message: 'Tạo sự cố',
        actorUserId: req.user._id,
        actorName: req.user.fullName,
      }],
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.create',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      changes: { title, severity },
      req,
    });

    emitIncident(req, 'incident:created', incident);
    res.status(201).json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.get('/:id', authorize('incident:read', 'incidents.read', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null })
      .populate('assignedTo', 'fullName email')
      .populate('relatedDeviceIds', 'name managementIp type')
      .populate('relatedAlertIds', 'title titleVi severity status')
      .lean();
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('incident:update', 'incidents.update', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null });
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });

    ['title', 'description', 'severity', 'status', 'rootCause', 'resolution'].forEach(field => {
      if (req.body[field] !== undefined) incident[field] = req.body[field];
    });
    if (req.body.relatedAlertIds) incident.relatedAlertIds = req.body.relatedAlertIds;
    if (req.body.relatedDeviceIds) incident.relatedDeviceIds = req.body.relatedDeviceIds;
    addTimeline(incident, 'updated', 'Cập nhật sự cố', req);
    await incident.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.update',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      changes: req.body,
      req,
    });

    emitIncident(req, 'incident:updated', incident);
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/:id/assign', authorize('incident:update', 'incidents.update', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null });
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });

    incident.assignedTo = req.body.assignedTo || req.user._id;
    if (incident.status === 'open') incident.status = 'investigating';
    addTimeline(incident, 'assigned', 'Gán người xử lý sự cố', req);
    await incident.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.assign',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      changes: { assignedTo: incident.assignedTo },
      req,
    });

    emitIncident(req, 'incident:updated', incident);
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/:id/comment', authorize('incident:update', 'incidents.update', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null });
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });
    if (!req.body.body) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập nội dung bình luận.' } });

    incident.comments.push({ body: req.body.body, createdBy: req.user._id, createdByName: req.user.fullName });
    addTimeline(incident, 'commented', 'Thêm bình luận', req);
    await incident.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.comment',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      changes: { comment: req.body.body },
      req,
    });

    emitIncident(req, 'incident:updated', incident);
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/:id/resolve', authorize('incident:update', 'incidents.update', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null });
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });

    incident.status = 'resolved';
    incident.resolution = req.body.resolution || incident.resolution;
    incident.rootCause = req.body.rootCause || incident.rootCause;
    incident.resolvedAt = new Date();
    addTimeline(incident, 'resolved', 'Đánh dấu sự cố đã xử lý', req);
    await incident.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.resolve',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      changes: { resolution: incident.resolution, rootCause: incident.rootCause },
      req,
    });

    emitIncident(req, 'incident:updated', incident);
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/:id/close', authorize('incident:update', 'incidents.update', '*'), async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, deletedAt: null });
    if (!incident) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy sự cố.' } });

    incident.status = 'closed';
    incident.closedAt = new Date();
    addTimeline(incident, 'closed', 'Đóng sự cố', req);
    await incident.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'incident.close',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      req,
    });

    emitIncident(req, 'incident:updated', incident);
    res.json({ data: incident });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
