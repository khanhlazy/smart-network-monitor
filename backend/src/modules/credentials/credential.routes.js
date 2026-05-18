const express = require('express');
const router = express.Router();
const Credential = require('./credential.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { encryptJson } = require('../../utils/crypto');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

router.get('/', authorize('credential:read', 'settings.manage', '*'), async (req, res) => {
  try {
    const credentials = await Credential.find({ deletedAt: null })
      .select('-encryptedPayload')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: credentials });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('credential:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const { name, type, payload } = req.body;
    if (!name || !type || !payload) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập đầy đủ thông tin credential.' } });
    }

    const credential = await Credential.create({
      name,
      type,
      encryptedPayload: encryptJson(payload),
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: `${type.startsWith('snmp') ? 'snmp' : type.startsWith('ssh') ? 'ssh' : 'credential'}.credential.create`,
      resourceType: 'credential',
      resourceId: credential._id.toString(),
      changes: { name, type },
      req,
    });

    const safe = credential.toObject();
    delete safe.encryptedPayload;
    res.status(201).json({ data: safe });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('credential:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const credential = await Credential.findOne({ _id: req.params.id, deletedAt: null });
    if (!credential) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy credential.' } });
    }

    if (req.body.name !== undefined) credential.name = req.body.name;
    if (req.body.payload !== undefined) credential.encryptedPayload = encryptJson(req.body.payload);
    credential.updatedBy = req.user._id;
    await credential.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: `${credential.type.startsWith('snmp') ? 'snmp' : credential.type.startsWith('ssh') ? 'ssh' : 'credential'}.credential.update`,
      resourceType: 'credential',
      resourceId: credential._id.toString(),
      changes: { name: credential.name, type: credential.type },
      req,
    });

    const safe = credential.toObject();
    delete safe.encryptedPayload;
    res.json({ data: safe });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('credential:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const credential = await Credential.findOne({ _id: req.params.id, deletedAt: null });
    if (!credential) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy credential.' } });
    }

    credential.deletedAt = new Date();
    credential.updatedBy = req.user._id;
    await credential.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: `${credential.type.startsWith('snmp') ? 'snmp' : credential.type.startsWith('ssh') ? 'ssh' : 'credential'}.credential.delete`,
      resourceType: 'credential',
      resourceId: credential._id.toString(),
      changes: { name: credential.name, type: credential.type },
      req,
    });

    res.json({ data: { message: 'Đã xóa credential.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
