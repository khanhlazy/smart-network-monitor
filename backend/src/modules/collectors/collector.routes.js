const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Collector = require('./collector.model');
const Device = require('../devices/device.model');
const DeviceState = require('../monitoring/deviceState.model');
const TelemetrySample = require('../telemetry/telemetrySample.model');
const { authenticate, authorize } = require('../../middlewares/auth');
const { createAuditLog } = require('../../utils/auditLogger');
const { incCounter } = require('../../utils/metrics');

// ──────────────────────────────────────────────────────────────
// Admin routes (require JWT auth)
// ──────────────────────────────────────────────────────────────
router.get('/', authenticate, authorize('collector:read', '*'), async (req, res) => {
  try {
    const collectors = await Collector.find().sort({ createdAt: -1 }).lean();

    for (let c of collectors) {
      c.assignedDeviceCount = await Device.countDocuments({ collectorId: c._id.toString(), deletedAt: null });
    }

    res.json({ data: collectors });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.post('/', authenticate, authorize('collector:manage', '*'), async (req, res) => {
  try {
    // Auto-generate a unique API key for the collector
    const apiKey = `col_${crypto.randomBytes(24).toString('hex')}`;
    const collector = await Collector.create({ ...req.body, apiKey });

    await createAuditLog({
      actorUserId: req.user._id,
      actorName: req.user.fullName,
      action: 'collector.create',
      resourceType: 'collector',
      resourceId: collector._id.toString(),
      changes: { name: collector.name, siteId: collector.siteId },
      req,
    });

    res.status(201).json({ data: collector });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.patch('/:id', authenticate, authorize('collector:manage', '*'), async (req, res) => {
  try {
    const allowed = ['name', 'siteId', 'version', 'status'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const collector = await Collector.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!collector) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy collector.' } });
    res.json({ data: collector });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', authenticate, authorize('collector:manage', '*'), async (req, res) => {
  try {
    const apiKey = `col_${crypto.randomBytes(24).toString('hex')}`;
    const collector = await Collector.findByIdAndUpdate(req.params.id, { $set: { apiKey } }, { new: true });
    if (!collector) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy collector.' } });
    res.json({ data: { apiKey: collector.apiKey } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

router.delete('/:id', authenticate, authorize('collector:manage', '*'), async (req, res) => {
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

// ──────────────────────────────────────────────────────────────
// Collector Agent API (authenticated via API key, NOT JWT)
// These endpoints are called by remote collector agents running
// inside customer LANs to push telemetry data back to the
// central SmartNMS server.
// ──────────────────────────────────────────────────────────────

const authenticateCollector = async (req, res, next) => {
  try {
    const authHeader = req.headers['x-collector-key'] || req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!apiKey) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing collector API key.' } });

    const collector = await Collector.findOne({ apiKey });
    if (!collector) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid collector API key.' } });

    req.collector = collector;
    next();
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

// Heartbeat endpoint – collector agent calls this periodically
router.post('/agent/heartbeat', authenticateCollector, async (req, res) => {
  try {
    const { health, network } = req.body;
    const collector = req.collector;

    collector.status = 'online';
    collector.lastHeartbeatAt = new Date();
    if (health) {
      collector.health = {
        cpuPct: health.cpuPct,
        memoryPct: health.memoryPct,
        queueLagMs: health.queueLagMs,
        pollSuccessRate: health.pollSuccessRate,
      };
    }
    if (network) {
      collector.network = {
        publicIp: network.publicIp || req.ip,
        localIp: network.localIp,
        hostname: network.hostname,
      };
    }
    await collector.save();

    // Return list of assigned devices for the collector to poll
    const devices = await Device.find({
      collectorId: collector._id.toString(),
      deletedAt: null,
      lifecycle: { $in: ['active', 'maintenance'] },
    }).lean();

    res.json({
      data: {
        message: 'Heartbeat received.',
        assignedDevices: devices.map((d) => ({
          _id: d._id,
          name: d.name,
          managementIp: d.managementIp,
          type: d.type,
          protocols: d.protocols,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

// Bulk telemetry ingest – collector agent pushes poll results here
router.post('/agent/telemetry', authenticateCollector, async (req, res) => {
  try {
    const { samples } = req.body; // Array of { deviceId, metric, value, unit, protocol, sampledAt }
    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Samples array is required.' } });
    }

    const io = req.app.get('io');
    let savedCount = 0;

    for (const sample of samples) {
      if (!sample.deviceId || !sample.metric || !Number.isFinite(sample.value)) continue;

      await TelemetrySample.create({
        deviceId: sample.deviceId,
        siteId: sample.siteId,
        metric: sample.metric,
        protocol: sample.protocol || 'icmp',
        value: sample.value,
        unit: sample.unit || '',
        collectorId: req.collector._id.toString(),
        sampledAt: sample.sampledAt ? new Date(sample.sampledAt) : new Date(),
      });

      // Update device state for key metrics
      const stateUpdates = {};
      if (sample.metric === 'latency_ms') stateUpdates.latencyMs = sample.value;
      if (sample.metric === 'packet_loss_pct') stateUpdates.packetLossPct = sample.value;
      if (sample.metric === 'cpu_pct') stateUpdates.cpuPct = sample.value;
      if (sample.metric === 'memory_pct') stateUpdates.memoryPct = sample.value;

      if (Object.keys(stateUpdates).length > 0) {
        stateUpdates.lastTelemetryAt = new Date();
        if (sample.metric === 'latency_ms' && sample.value !== null) {
          stateUpdates.lastSeenAt = new Date();
        }
        await DeviceState.findOneAndUpdate(
          { deviceId: sample.deviceId },
          { $set: stateUpdates },
          { upsert: true },
        );

        if (io) {
          io.emit('device:state.updated', {
            event: 'device:state.updated',
            data: { deviceId: sample.deviceId, ...stateUpdates },
          });
        }
      }

      savedCount++;
      incCounter('telemetry_samples_total');
    }

    if (io) {
      io.emit('dashboard:summary.updated', { event: 'dashboard:summary.updated', data: { updatedAt: new Date() } });
    }

    res.json({ data: { message: `Ingested ${savedCount} samples.`, savedCount } });
  } catch (error) {
    console.error('Collector telemetry ingest error:', error.message);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

// Device status report – collector reports device up/down status
router.post('/agent/status', authenticateCollector, async (req, res) => {
  try {
    const { statuses } = req.body; // Array of { deviceId, alive, latencyMs, packetLossPct }
    if (!Array.isArray(statuses)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Statuses array is required.' } });
    }

    const io = req.app.get('io');

    for (const s of statuses) {
      let state = await DeviceState.findOne({ deviceId: s.deviceId });
      if (!state) state = await DeviceState.create({ deviceId: s.deviceId, status: 'unknown' });

      if (s.alive) {
        state.status = 'online';
        state.consecutiveFailures = 0;
        state.latencyMs = s.latencyMs;
        state.packetLossPct = s.packetLossPct || 0;
        state.lastSeenAt = new Date();
        state.healthScore = Math.max(0, 100 - (s.latencyMs > 100 ? 30 : 0) - (s.packetLossPct > 5 ? 30 : 0));
      } else {
        state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
        if (state.consecutiveFailures >= 3) state.status = 'offline';
        state.packetLossPct = 100;
        state.healthScore = 0;
      }
      state.lastTelemetryAt = new Date();
      await state.save();

      if (io) {
        io.emit('device:state.updated', {
          event: 'device:state.updated',
          data: {
            deviceId: s.deviceId,
            status: state.status,
            latencyMs: state.latencyMs,
            packetLossPct: state.packetLossPct,
            healthScore: state.healthScore,
            lastSeenAt: state.lastSeenAt,
          },
        });
      }
    }

    res.json({ data: { message: `Processed ${statuses.length} device statuses.` } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
});

module.exports = router;
