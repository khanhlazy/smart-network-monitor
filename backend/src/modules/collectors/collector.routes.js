const express = require('express');
const router = express.Router();
const Collector = require('./collector.model');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('collector:read', '*'), async (req, res) => {
  try {
    const collectors = await Collector.find().sort({ createdAt: -1 }).lean();
    const mongoose = require('mongoose');
    const Device = mongoose.model('Device');
    
    for (let c of collectors) {
      c.assignedDeviceCount = await Device.countDocuments({ collectorId: c._id.toString(), deletedAt: null });
    }
    
    res.json({ data: collectors });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authorize('collector:manage', '*'), async (req, res) => {
  try {
    const collector = await Collector.create(req.body);
    res.status(201).json({ data: collector });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authorize('collector:manage', '*'), async (req, res) => {
  try {
    const collector = await Collector.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!collector) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy collector.' } });
    res.json({ data: collector });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authorize('collector:manage', '*'), async (req, res) => {
  try {
    const collector = await Collector.findByIdAndDelete(req.params.id);
    if (!collector) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy collector.' } });
    }
    res.json({ data: { message: 'Đã xóa collector.' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
