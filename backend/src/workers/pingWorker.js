const ping = require('ping');
const Device = require('../modules/devices/device.model');
const DeviceState = require('../modules/monitoring/deviceState.model');
const TelemetrySample = require('../modules/telemetry/telemetrySample.model');
const Alert = require('../modules/alerts/alert.model');
const MaintenanceWindow = require('../modules/maintenance/maintenanceWindow.model');
const config = require('../config');
const { incCounter, setGauge } = require('../utils/metrics');
const { dispatchAlertNotifications } = require('../modules/notifications/notification.service');

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const pingDevice = async (device) => {
  try {
    const isWin = process.platform === 'win32';
    const result = await ping.promise.probe(device.managementIp, {
      timeout: Math.ceil(config.monitoring.pingTimeoutMs / 1000),
      extra: isWin ? ['-n', '3'] : ['-c', '3'],
    });

    let latencyMs = result.alive ? parseFloat(result.time) || 0 : null;
    let packetLossPct = result.packetLoss ? parseFloat(result.packetLoss) : (result.alive ? 0 : 100);
    
    if (latencyMs !== null && isNaN(latencyMs)) latencyMs = 0;
    if (isNaN(packetLossPct)) packetLossPct = result.alive ? 0 : 100;

    return { alive: result.alive, latencyMs, packetLossPct };
  } catch (error) {
    console.error(`Ping failed for ${device.managementIp}:`, error.message);
    return { alive: false, latencyMs: null, packetLossPct: 100 };
  }
};

const calculateHealthScore = (alive, latencyMs, packetLossPct) => {
  if (!alive) return 0;

  let score = 100;
  if (latencyMs > 200) score -= 40;
  else if (latencyMs > 100) score -= 20;
  else if (latencyMs > 50) score -= 10;

  if (packetLossPct > 10) score -= 40;
  else if (packetLossPct > 5) score -= 20;
  else if (packetLossPct > 1) score -= 10;

  return Math.max(0, score);
};

const isDeviceInMaintenance = async (device) => {
  const now = new Date();
  const activeWindow = await MaintenanceWindow.findOne({
    deletedAt: null,
    suppressAlerts: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    $or: [
      { scopeType: 'all' },
      { deviceIds: device._id },
      { siteIds: device.siteId },
      { tags: { $in: device.tags || [] } },
    ],
  }).lean();

  return !!activeWindow;
};

const checkAlertRules = async (device, state, pingResult) => {
  const { alive, latencyMs, packetLossPct } = pingResult;

  // Device Down Alert
  if (state.consecutiveFailures >= config.monitoring.offlineFailureThreshold) {
    const dedupKey = `device_down:${device._id}`;
    const existingAlert = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });

    if (!existingAlert) {
      const alert = await Alert.create({
        ruleId: 'rule_device_down',
        deviceId: device._id,
        siteId: device.siteId,
        title: 'Device Offline',
        titleVi: 'Thiết bị mất kết nối',
        description: `${device.name} (${device.managementIp}) is unreachable`,
        descriptionVi: `${device.name} (${device.managementIp}) không thể kết nối`,
        severity: 'critical',
        status: 'open',
        metric: 'availability',
        currentValue: 0,
        dedupKey,
        firstOccurredAt: new Date(),
        lastOccurredAt: new Date(),
      });

      if (io) {
        io.emit('alert:created', { data: alert });
      }
      incCounter('alerts_created_total');
      dispatchAlertNotifications(alert);
    } else {
      existingAlert.occurrenceCount += 1;
      existingAlert.lastOccurredAt = new Date();
      await existingAlert.save();
    }
  }

  // Auto-resolve device down alert when back online
  if (alive && state.consecutiveFailures === 0) {
    const openDownAlert = await Alert.findOne({
      dedupKey: `device_down:${device._id}`,
      status: { $in: ['open', 'acknowledged'] },
    });
    if (openDownAlert) {
      openDownAlert.status = 'resolved';
      openDownAlert.resolvedAt = new Date();
      openDownAlert.resolutionNote = 'Tự động khôi phục kết nối.';
      await openDownAlert.save();

      if (io) {
        io.emit('alert:updated', { data: openDownAlert });
      }
    }
  }

  // High Latency Alert
  if (alive && latencyMs > 100) {
    const dedupKey = `high_latency:${device._id}`;
    const existingAlert = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });

    if (!existingAlert) {
      const alert = await Alert.create({
        ruleId: 'rule_high_latency',
        deviceId: device._id,
        siteId: device.siteId,
        title: 'High Latency Detected',
        titleVi: 'Phát hiện độ trễ cao',
        severity: 'warning',
        status: 'open',
        metric: 'latency_ms',
        currentValue: latencyMs,
        threshold: { operator: 'gt', value: 100 },
        dedupKey,
      });

      if (io) io.emit('alert:created', { data: alert });
      incCounter('alerts_created_total');
      dispatchAlertNotifications(alert);
    } else {
      existingAlert.currentValue = latencyMs;
      existingAlert.occurrenceCount += 1;
      existingAlert.lastOccurredAt = new Date();
      await existingAlert.save();
    }
  } else if (alive && latencyMs !== null && latencyMs <= 100) {
    // Auto-resolve latency alert
    const alert = await Alert.findOne({
      dedupKey: `high_latency:${device._id}`,
      status: { $in: ['open', 'acknowledged'] },
    });
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolutionNote = 'Độ trễ đã trở về bình thường.';
      await alert.save();
      if (io) io.emit('alert:updated', { data: alert });
    }
  }

  // Packet Loss Alert
  if (alive && packetLossPct > 5) {
    const dedupKey = `packet_loss:${device._id}`;
    const existingAlert = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });

    if (!existingAlert) {
      const alert = await Alert.create({
        ruleId: 'rule_packet_loss',
        deviceId: device._id,
        siteId: device.siteId,
        title: 'Packet Loss Warning',
        titleVi: 'Cảnh báo mất gói tin',
        severity: 'warning',
        status: 'open',
        metric: 'packet_loss_pct',
        currentValue: packetLossPct,
        threshold: { operator: 'gt', value: 5 },
        dedupKey,
      });

      if (io) io.emit('alert:created', { data: alert });
      incCounter('alerts_created_total');
      dispatchAlertNotifications(alert);
    }
  }
};

const runMonitoringCycle = async () => {
  const cycleStart = Date.now();
  try {
    const devices = await Device.find({
      deletedAt: null,
      lifecycle: { $in: ['active', 'maintenance'] },
    }).lean();

    if (devices.length === 0) return;

    console.log(`[Worker] Monitoring ${devices.length} devices...`);

    for (const device of devices) {
      const inMaintenance = await isDeviceInMaintenance(device);
      const pingResult = await pingDevice(device);
      const { alive, latencyMs, packetLossPct } = pingResult;

      // Get or create device state
      let state = await DeviceState.findOne({ deviceId: device._id });
      if (!state) {
        state = await DeviceState.create({ deviceId: device._id, status: 'unknown' });
      }

      const previousStatus = state.status;

      // Update state
      if (inMaintenance) {
        state.status = 'maintenance';
        if (alive) {
          state.consecutiveFailures = 0;
          state.latencyMs = latencyMs;
          state.packetLossPct = packetLossPct;
          state.lastSeenAt = new Date();
          state.healthScore = calculateHealthScore(alive, latencyMs, packetLossPct);
        }
      } else if (alive) {
        state.status = packetLossPct > 5 || latencyMs > 100 ? 'warning' : 'online';
        state.consecutiveFailures = 0;
        state.latencyMs = latencyMs;
        state.packetLossPct = packetLossPct;
        state.lastSeenAt = new Date();
        state.healthScore = calculateHealthScore(alive, latencyMs, packetLossPct);
      } else {
        state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
        if (state.consecutiveFailures >= config.monitoring.offlineFailureThreshold) {
          state.status = 'offline';
        }
        state.packetLossPct = 100;
        state.healthScore = 0;
      }

      state.lastTelemetryAt = new Date();
      if (previousStatus !== state.status) {
        state.lastChangeAt = new Date();
      }
      await state.save();

      // Save telemetry samples
      if (latencyMs !== null && Number.isFinite(latencyMs)) {
        await TelemetrySample.create({
          deviceId: device._id,
          siteId: device.siteId,
          metric: 'latency_ms',
          protocol: 'icmp',
          value: latencyMs,
          unit: 'ms',
          sampledAt: new Date(),
        });
        incCounter('telemetry_samples_total');
      }

      if (Number.isFinite(packetLossPct)) {
        await TelemetrySample.create({
          deviceId: device._id,
          siteId: device.siteId,
          metric: 'packet_loss_pct',
          protocol: 'icmp',
          value: packetLossPct,
          unit: '%',
          sampledAt: new Date(),
        });
        incCounter('telemetry_samples_total');
      }

      // Check alert rules
      if (!inMaintenance) {
        await checkAlertRules(device, state, pingResult);
      }

      // Emit realtime update
      if (io) {
        io.emit('device:state.updated', {
          event: 'device:state.updated',
          data: {
            deviceId: device._id,
            name: device.name,
            status: state.status,
            latencyMs: state.latencyMs,
            packetLossPct: state.packetLossPct,
            healthScore: state.healthScore,
            lastSeenAt: state.lastSeenAt,
          },
        });
      }
    }

    // Emit dashboard update
    if (io) {
      io.emit('dashboard:summary.updated', { event: 'dashboard:summary.updated', data: { updatedAt: new Date() } });
    }

    console.log(`[Worker] Monitoring cycle completed for ${devices.length} devices`);
  } catch (error) {
    console.error('Monitoring cycle error:', error);
  } finally {
    setGauge('worker_ping_duration_ms', Date.now() - cycleStart);
  }
};

module.exports = { runMonitoringCycle, setIO };
