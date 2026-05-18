const express = require('express');
const router = express.Router();
const AnomalyEvent = require('./anomalyEvent.model');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('anomaly:read', 'dashboard:read', '*'), async (req, res) => {
  try {
    const { metric, severity, deviceId, page = 1, pageSize = 50 } = req.query;
    const filter = {};
    if (metric) filter.metric = metric;
    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [events, total] = await Promise.all([
      AnomalyEvent.find(filter).populate('deviceId', 'name managementIp type siteId').sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize)).lean(),
      AnomalyEvent.countDocuments(filter),
    ]);

    res.json({
      data: events,
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

module.exports = router;
