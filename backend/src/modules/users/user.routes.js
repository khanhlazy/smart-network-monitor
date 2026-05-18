const express = require('express');
const router = express.Router();
const User = require('./user.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

router.get('/', authorize('user:read', '*'), async (req, res) => {
  try {
    const users = await User.find().populate('roleIds', 'name nameVi').sort({ createdAt: -1 }).lean();
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('user:create', '*'), async (req, res) => {
  try {
    const { fullName, username, email, password, roleIds } = req.body;
    const user = await User.create({
      fullName,
      username,
      email,
      passwordHash: password,
      roleIds: roleIds || [],
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'user.create',
      resourceType: 'user',
      resourceId: user._id.toString(),
      req,
    });

    res.status(201).json({ data: user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Tài khoản hoặc email đã tồn tại.' } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});
router.patch('/:id', authorize('user:manage', '*'), async (req, res) => {
  try {
    const { fullName, status, roleIds, password } = req.body;
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (status) updateData.status = status;
    if (roleIds) updateData.roleIds = roleIds;
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    
    if (password) {
      user.passwordHash = password; // The pre-save hook will hash it
    }
    
    Object.assign(user, updateData);
    await user.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'user.update',
      resourceType: 'user',
      resourceId: user._id.toString(),
      req,
    });

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('user:manage', '*'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'user.delete',
      resourceType: 'user',
      resourceId: user._id.toString(),
      req,
    });

    res.json({ data: { message: 'User deleted.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
