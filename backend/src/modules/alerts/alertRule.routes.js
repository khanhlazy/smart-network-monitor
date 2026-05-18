const express = require('express');
const router = express.Router();
const AlertRule = require('./alertRule.model');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('alert:read', '*'), async (req, res) => {
  try {
    const rules = await AlertRule.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
    res.json({ data: rules });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('alert:manage', '*'), async (req, res) => {
  try {
    const rule = await AlertRule.create(req.body);
    res.status(201).json({ data: rule });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('alert:manage', '*'), async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!rule) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy quy tắc.' } });
    res.json({ data: rule });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('alert:manage', '*'), async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy quy tắc.' } });
    }
    rule.deletedAt = new Date();
    rule.enabled = false;
    await rule.save();
    res.json({ data: { message: 'Đã xóa quy tắc cảnh báo.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
