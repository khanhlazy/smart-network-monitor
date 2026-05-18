const express = require('express');
const router = express.Router();
const AuditLog = require('./auditLog.model');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('audit:read', '*'), async (req, res) => {
  try {
    const { page = 1, pageSize = 50, action, resourceType, actorUserId, sort = '-createdAt' } = req.query;
    const filter = {};

    if (action) filter.action = { $regex: action, $options: 'i' };
    if (resourceType) filter.resourceType = resourceType;
    if (actorUserId) filter.actorUserId = actorUserId;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort(sortObj).skip(skip).limit(parseInt(pageSize)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      data: logs,
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
