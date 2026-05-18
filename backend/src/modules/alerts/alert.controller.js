const Alert = require('./alert.model');
const { createAuditLog } = require('../../utils/auditLogger');

exports.list = async (req, res) => {
  try {
    const { page = 1, pageSize = 50, status, severity, deviceId, sort = '-lastOccurredAt' } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .populate('deviceId', 'name managementIp type')
        .populate('acknowledgedBy', 'fullName')
        .populate('resolvedBy', 'fullName')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      Alert.countDocuments(filter),
    ]);

    res.json({
      data: alerts,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.getById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('deviceId', 'name managementIp type siteId')
      .populate('acknowledgedBy', 'fullName')
      .populate('resolvedBy', 'fullName')
      .lean();

    if (!alert) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy cảnh báo.' } });
    }

    res.json({ data: alert });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.acknowledge = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy cảnh báo.' } });
    }

    if (alert.status !== 'open') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Chỉ có thể xác nhận cảnh báo đang mở.' } });
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    await alert.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'alert.acknowledge',
      resourceType: 'alert',
      resourceId: alert._id.toString(),
      changes: { title: alert.title },
      req,
    });

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('alert:updated', { data: alert });
    }

    res.json({ data: alert });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.resolve = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy cảnh báo.' } });
    }

    if (!['open', 'acknowledged'].includes(alert.status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Không thể xử lý cảnh báo ở trạng thái này.' } });
    }

    alert.status = 'resolved';
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    alert.resolutionNote = req.body.resolutionNote || '';
    await alert.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'alert.resolve',
      resourceType: 'alert',
      resourceId: alert._id.toString(),
      changes: { title: alert.title, resolutionNote: alert.resolutionNote },
      req,
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('alert:updated', { data: alert });
    }

    res.json({ data: alert });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.suppress = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy cảnh báo.' } });
    }

    alert.status = 'suppressed';
    alert.suppressedUntil = req.body.suppressedUntil ? new Date(req.body.suppressedUntil) : new Date(Date.now() + 3600000);
    await alert.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'alert.suppress',
      resourceType: 'alert',
      resourceId: alert._id.toString(),
      changes: { title: alert.title },
      req,
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('alert:updated', { data: alert });
    }

    res.json({ data: alert });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};
