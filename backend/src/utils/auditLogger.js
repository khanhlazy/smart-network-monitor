const AuditLog = require('../modules/audit/auditLog.model');

const createAuditLog = async ({ actorUserId, actorName, action, resourceType, resourceId, result, changes, req }) => {
  try {
    await AuditLog.create({
      actorUserId,
      actorName,
      action,
      resourceType,
      resourceId,
      result: result || 'success',
      changes,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined,
      requestId: req ? req.headers['x-request-id'] : undefined,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

module.exports = { createAuditLog };
