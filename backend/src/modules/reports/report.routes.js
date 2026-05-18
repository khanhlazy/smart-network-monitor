const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Report = require('./report.model');
const Device = require('../devices/device.model');
const DeviceState = require('../monitoring/deviceState.model');
const Alert = require('../alerts/alert.model');
const Incident = require('../incidents/incident.model');
const Collector = require('../collectors/collector.model');
const config = require('../../config');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');

router.use(authenticate);

const ensureReportDir = () => {
  const dir = path.resolve(process.cwd(), config.reports.outputDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const toCsv = (rows) => {
  if (!rows.length) return 'label,value\nKhông có dữ liệu,0\n';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
};

const toExcelHtml = (rows, title) => {
  const headers = rows[0] ? Object.keys(rows[0]) : ['label', 'value'];
  const dataRows = rows.length ? rows : [{ label: 'Không có dữ liệu', value: 0 }];
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <h1>${title}</h1>
    <table border="1"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${dataRows.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </body></html>`;
};

const toPdf = (rows, title) => {
  const text = [title, `Generated at: ${new Date().toISOString()}`, '', ...rows.slice(0, 80).map(row => JSON.stringify(row))].join('\n');
  const escaped = text.replace(/[\\()]/g, '\\$&').replace(/\r?\n/g, ') Tj T* (');
  const stream = `BT /F1 10 Tf 36 780 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${obj}\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

const collectRows = async (type) => {
  if (type === 'device_offline') {
    const states = await DeviceState.find({ status: 'offline' }).populate('deviceId', 'name managementIp siteId type').lean();
    return states.map(state => ({
      device: state.deviceId?.name,
      ip: state.deviceId?.managementIp,
      site: state.deviceId?.siteId,
      lastSeenAt: state.lastSeenAt,
      packetLossPct: state.packetLossPct,
    }));
  }

  if (type === 'alert') {
    const alerts = await Alert.find().populate('deviceId', 'name managementIp').sort({ createdAt: -1 }).limit(500).lean();
    return alerts.map(alert => ({
      title: alert.titleVi || alert.title,
      device: alert.deviceId?.name,
      severity: alert.severity,
      status: alert.status,
      lastOccurredAt: alert.lastOccurredAt,
    }));
  }

  if (type === 'incident') {
    const incidents = await Incident.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(500).lean();
    return incidents.map(incident => ({
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      firstSeenAt: incident.firstSeenAt,
      resolvedAt: incident.resolvedAt,
    }));
  }

  if (type === 'collector_health') {
    const collectors = await Collector.find().sort({ name: 1 }).lean();
    return collectors.map(collector => ({
      name: collector.name,
      status: collector.status,
      siteId: collector.siteId,
      lastHeartbeatAt: collector.lastHeartbeatAt,
      assignedDeviceCount: collector.assignedDeviceCount,
      pollSuccessRate: collector.health?.pollSuccessRate,
    }));
  }

  const [devices, states] = await Promise.all([
    Device.find({ deletedAt: null }).lean(),
    DeviceState.find().lean(),
  ]);
  const stateMap = new Map(states.map(state => [state.deviceId.toString(), state]));
  return devices.map(device => {
    const state = stateMap.get(device._id.toString());
    return {
      device: device.name,
      ip: device.managementIp,
      site: device.siteId,
      status: state?.status || 'unknown',
      healthScore: state?.healthScore || 0,
      latencyMs: state?.latencyMs,
      packetLossPct: state?.packetLossPct,
    };
  });
};

router.get('/', authorize('report:read', 'reports.read', '*'), async (req, res) => {
  try {
    const reports = await Report.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ data: reports });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/generate', authorize('report:create', 'reports.create', '*'), async (req, res) => {
  try {
    const { type, format = 'csv', params = {} } = req.body;
    if (!type) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn loại báo cáo.' } });

    const report = await Report.create({
      type,
      format,
      params,
      status: 'generating',
      generatedBy: req.user._id,
      expiresAt: new Date(Date.now() + config.reports.ttlHours * 3600000),
    });

    const rows = await collectRows(type);
    const title = `SmartNMS ${type} report`;
    const dir = ensureReportDir();
    const ext = format === 'excel' ? 'xls' : format;
    const fileName = `${report._id}.${ext}`;
    const filePath = path.join(dir, fileName);

    if (format === 'pdf') fs.writeFileSync(filePath, toPdf(rows, title));
    else if (format === 'excel') fs.writeFileSync(filePath, toExcelHtml(rows, title), 'utf8');
    else fs.writeFileSync(filePath, `\uFEFF${toCsv(rows)}`, 'utf8');

    report.status = 'completed';
    report.filePath = filePath;
    report.storageKey = fileName;
    report.generatedAt = new Date();
    await report.save();

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'report.generate',
      resourceType: 'report',
      resourceId: report._id.toString(),
      changes: { type, format },
      req,
    });

    const io = req.app.get('io');
    if (io) io.emit('report:ready', { event: 'report:ready', data: { reportId: report._id, type, format } });

    res.status(201).json({ data: report });
  } catch (error) {
    console.error('Generate report error:', error);
    const io = req.app.get('io');
    if (io) io.emit('report:failed', { event: 'report:failed', data: { error: error.message } });
    res.status(500).json({ error: { code: 'REPORT_FAILED', message: 'Tạo báo cáo thất bại.' } });
  }
});

router.get('/:id/download', authorize('report:read', 'reports.read', '*'), async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, deletedAt: null });
    if (!report || report.status !== 'completed' || !report.filePath) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy file báo cáo.' } });
    }

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'report.download',
      resourceType: 'report',
      resourceId: report._id.toString(),
      changes: { type: report.type, format: report.format },
      req,
    });

    const ext = report.format === 'excel' ? 'xls' : report.format;
    res.download(report.filePath, `smartnms-${report.type}-${report._id}.${ext}`);
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi tải báo cáo.' } });
  }
});

module.exports = router;
