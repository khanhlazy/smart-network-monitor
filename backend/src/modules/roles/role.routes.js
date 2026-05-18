const express = require('express');
const router = express.Router();
const Role = require('./role.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

router.get('/', authorize('role:read', 'roles.manage', '*'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('role:manage', 'roles.manage', '*'), async (req, res) => {
  try {
    const role = await Role.create(req.body);
    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'role.create',
      resourceType: 'role',
      resourceId: role._id.toString(),
      changes: { name: role.name, permissions: role.permissions },
      req,
    });
    res.status(201).json({ data: role });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('role:manage', 'roles.manage', '*'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy vai trò.' } });

    const beforePermissions = role.permissions || [];
    ['name', 'nameVi', 'description', 'descriptionVi', 'permissions'].forEach(field => {
      if (req.body[field] !== undefined) role[field] = req.body[field];
    });
    await role.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'role.permission.update',
      resourceType: 'role',
      resourceId: role._id.toString(),
      changes: { beforePermissions, afterPermissions: role.permissions },
      req,
    });

    res.json({ data: role });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
