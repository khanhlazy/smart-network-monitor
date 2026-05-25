const express = require('express');
const router = express.Router();
const AnomalyEvent = require('./anomalyEvent.model');
const DeviceState = require('../monitoring/deviceState.model');
const Alert = require('../alerts/alert.model');
const Device = require('../devices/device.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { GoogleGenAI } = require('@google/genai');

router.use(authenticate);

router.get('/ai-insights', authorize('anomaly:read', 'dashboard:read', '*'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: { code: 'MISSING_API_KEY', message: 'Vui lòng cấu hình GEMINI_API_KEY trong file .env để sử dụng tính năng AI.' } });
    }

    // Gather network context for the AI
    const [offlineStates, activeAlerts, recentAnomalies, totalDevices] = await Promise.all([
      DeviceState.find({ status: { $ne: 'online' } }).populate('deviceId', 'name type siteId').lean(),
      Alert.find({ status: { $ne: 'resolved' } }).populate('deviceId', 'name').lean(),
      AnomalyEvent.find().sort({ createdAt: -1 }).limit(10).populate('deviceId', 'name').lean(),
      Device.countDocuments({ deletedAt: null })
    ]);

    const context = `
Hệ thống mạng hiện tại có tổng cộng ${totalDevices} thiết bị.
1. Thiết bị đang offline/có vấn đề: ${offlineStates.length} thiết bị.
${offlineStates.map(s => `- ${s.deviceId?.name} (${s.deviceId?.type}): Trạng thái ${s.status}, Packet Loss: ${s.packetLossPct}%, CPU: ${s.cpuPct}%`).join('\n')}

2. Cảnh báo đang mở (Active Alerts): ${activeAlerts.length} cảnh báo.
${activeAlerts.map(a => `- [${a.severity.toUpperCase()}] ${a.deviceId?.name || 'Hệ thống'}: ${a.nameVi || a.name} (Metric: ${a.metric})`).join('\n')}

3. Bất thường gần đây (Anomalies):
${recentAnomalies.map(a => `- ${a.deviceId?.name}: ${a.metric} có điểm bất thường ${Math.round(a.anomalyScore * 100) / 100} (${a.explanation})`).join('\n')}

Bạn là một chuyên gia quản trị mạng (NOC Expert). Dựa vào dữ liệu trên, hãy phân tích nhanh tình trạng mạng hiện tại, chỉ ra nguyên nhân gốc rễ (Root Cause) nếu có sự cố dây chuyền, và đưa ra 1-2 hành động khắc phục cụ thể. Hãy viết bằng tiếng Việt, trình bày chuyên nghiệp dùng Markdown (in đậm, danh sách), ngắn gọn dưới 200 chữ. Nếu mạng bình thường (không có thiết bị offline, không có cảnh báo), hãy báo cáo mạng đang hoạt động ổn định.
    `;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: context,
    });

    res.json({ data: { insights: response.text } });
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({ error: { code: 'AI_ERROR', message: `Không thể kết nối đến AI: ${error.message}` } });
  }
});

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
