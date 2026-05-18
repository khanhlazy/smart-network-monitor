const express = require('express');
const router = express.Router();
const NotificationChannel = require('./notificationChannel.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { encryptJson } = require('../../utils/crypto');
const { createAuditLog } = require('../../utils/auditLogger');
const { deliverNotification } = require('./notification.service');

router.use(authenticate);

const safeChannel = (channel) => {
  const data = channel.toObject ? channel.toObject() : channel;
  delete data.configEncrypted;
  return data;
};

router.get('/', authorize('notification:read', 'settings.manage', '*'), async (req, res) => {
  try {
    const channels = await NotificationChannel.find({ deletedAt: null })
      .select('-configEncrypted')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: channels });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('notification:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const { name, type, config: channelConfig, enabled = true, severityFilter = [], siteFilter = [] } = req.body;
    if (!name || !type || !channelConfig) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập đầy đủ thông tin kênh thông báo.' } });
    }

    const channel = await NotificationChannel.create({
      name,
      type,
      configEncrypted: encryptJson(channelConfig),
      enabled,
      severityFilter,
      siteFilter,
      createdBy: req.user._id,
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'notification.channel.create',
      resourceType: 'notification_channel',
      resourceId: channel._id.toString(),
      changes: { name, type, enabled, severityFilter, siteFilter },
      req,
    });

    res.status(201).json({ data: safeChannel(channel) });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('notification:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const channel = await NotificationChannel.findOne({ _id: req.params.id, deletedAt: null });
    if (!channel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy kênh thông báo.' } });

    ['name', 'type', 'enabled', 'severityFilter', 'siteFilter'].forEach((field) => {
      if (req.body[field] !== undefined) channel[field] = req.body[field];
    });
    if (req.body.config) channel.configEncrypted = encryptJson(req.body.config);
    await channel.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'notification.channel.update',
      resourceType: 'notification_channel',
      resourceId: channel._id.toString(),
      changes: { name: channel.name, type: channel.type, enabled: channel.enabled },
      req,
    });

    res.json({ data: safeChannel(channel) });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('notification:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const channel = await NotificationChannel.findOne({ _id: req.params.id, deletedAt: null });
    if (!channel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy kênh thông báo.' } });

    channel.deletedAt = new Date();
    await channel.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'notification.channel.delete',
      resourceType: 'notification_channel',
      resourceId: channel._id.toString(),
      changes: { name: channel.name, type: channel.type },
      req,
    });

    res.json({ data: { message: 'Đã xóa kênh thông báo.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/:id/test', authorize('notification:manage', 'settings.manage', '*'), async (req, res) => {
  try {
    const channel = await NotificationChannel.findOne({ _id: req.params.id, deletedAt: null });
    if (!channel) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy kênh thông báo.' } });

    const delivery = await deliverNotification(channel, {
      title: 'SmartNMS test alert',
      titleVi: 'Cảnh báo kiểm tra SmartNMS',
      severity: 'warning',
      status: 'open',
      metric: 'notification_test',
      currentValue: 1,
      lastOccurredAt: new Date(),
    });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'notification.channel.test',
      resourceType: 'notification_channel',
      resourceId: channel._id.toString(),
      changes: { name: channel.name, type: channel.type, delivery },
      req,
    });

    res.json({ data: { message: 'Đã gửi kiểm tra thử.', delivery, channel: safeChannel(channel) } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi kiểm tra kênh thông báo.' } });
  }
});

module.exports = router;
