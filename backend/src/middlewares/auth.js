const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../modules/users/user.model');

const permissionAliases = {
  'device:read': ['devices.read'],
  'device:create': ['devices.create'],
  'device:update': ['devices.update'],
  'device:delete': ['devices.delete'],
  'devices.read': ['device:read'],
  'devices.create': ['device:create'],
  'devices.update': ['device:update'],
  'devices.delete': ['device:delete'],

  'alert:read': ['alerts.read'],
  'alert:acknowledge': ['alerts.ack'],
  'alert:resolve': ['alerts.resolve'],
  'alert:manage': ['alerts.manage', 'alerts.read', 'alerts.ack', 'alerts.resolve'],
  'alerts.read': ['alert:read'],
  'alerts.ack': ['alert:acknowledge'],
  'alerts.resolve': ['alert:resolve'],
  'alerts.manage': ['alert:manage'],

  'incident:read': ['incidents.read'],
  'incident:create': ['incidents.create'],
  'incident:update': ['incidents.update'],
  'incidents.read': ['incident:read'],
  'incidents.create': ['incident:create'],
  'incidents.update': ['incident:update'],

  'report:read': ['reports.read'],
  'report:create': ['reports.create'],
  'reports.read': ['report:read'],
  'reports.create': ['report:create'],

  'role:read': ['roles.manage'],
  'role:manage': ['roles.manage'],
  'roles.manage': ['role:read', 'role:manage'],

  'audit:read': ['audit.read'],
  'audit.read': ['audit:read'],

  'maintenance:read': ['maintenance.manage'],
  'maintenance:manage': ['maintenance.manage'],
  'maintenance.manage': ['maintenance:read', 'maintenance:manage'],

  'topology:read': ['topology.manage'],
  'topology:manage': ['topology.manage'],
  'topology.manage': ['topology:read', 'topology:manage'],

  'user:manage': ['users.manage'],
  'users.manage': ['user:manage'],
  'settings:update': ['settings.manage'],
  'settings.manage': ['settings:update'],
};

const expandPermission = (permission) => {
  const values = new Set([permission]);
  (permissionAliases[permission] || []).forEach(alias => values.add(alias));
  return values;
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findById(decoded.userId).populate('roleIds');
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Tài khoản không hợp lệ hoặc đã bị khóa.' }
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' }
      });
    }
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token không hợp lệ.' }
    });
  }
};

const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' }
      });
    }

    const userPermissions = new Set();
    if (req.user.roleIds) {
      req.user.roleIds.forEach(role => {
        if (role.permissions) {
          role.permissions.forEach((p) => {
            expandPermission(p).forEach(permission => userPermissions.add(permission));
          });
        }
      });
    }

    const requestedPermissions = permissions.flatMap(p => [...expandPermission(p)]);
    const hasPermission = requestedPermissions.some(p => userPermissions.has(p) || userPermissions.has('*'));
    if (!hasPermission) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này.' }
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
