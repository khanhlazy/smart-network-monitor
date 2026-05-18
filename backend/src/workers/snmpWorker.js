const Device = require('../modules/devices/device.model');
const DeviceState = require('../modules/monitoring/deviceState.model');
const TelemetrySample = require('../modules/telemetry/telemetrySample.model');
const Alert = require('../modules/alerts/alert.model');
const Credential = require('../modules/credentials/credential.model');
const { collectSnmpMetrics } = require('../modules/collectors/snmp/snmp.service');
const { decryptJson } = require('../utils/crypto');
const { incCounter, setGauge } = require('../utils/metrics');
const { dispatchAlertNotifications } = require('../modules/notifications/notification.service');

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const saveTelemetry = async (device, metric, value, unit) => {
  if (!Number.isFinite(value)) return;
  await TelemetrySample.create({
    deviceId: device._id,
    siteId: device.siteId,
    metric,
    protocol: 'snmp',
    value,
    unit,
    collectorId: device.collectorId,
    sampledAt: new Date(),
  });
  incCounter('telemetry_samples_total');
};

const createOrUpdateAlert = async (device, key, payload) => {
  const dedupKey = `${key}:${device._id}`;
  const existing = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });
  if (existing) {
    existing.occurrenceCount += 1;
    existing.lastOccurredAt = new Date();
    if (payload.currentValue !== undefined) existing.currentValue = payload.currentValue;
    await existing.save();
    return existing;
  }

  const alert = await Alert.create({
    ...payload,
    deviceId: device._id,
    siteId: device.siteId,
    status: 'open',
    dedupKey,
  });

  if (io) io.emit('alert:created', { event: 'alert:created', data: alert });
  incCounter('alerts_created_total');
  dispatchAlertNotifications(alert);
  return alert;
};

const autoResolveAlert = async (device, key) => {
  const dedupKey = `${key}:${device._id}`;
  const alert = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });
  if (alert) {
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolutionNote = 'Tự động khôi phục về ngưỡng bình thường.';
    await alert.save();
    if (io) io.emit('alert:updated', { event: 'alert:updated', data: alert });
  }
};

const runSnmpCycle = async () => {
  const startedAt = Date.now();
  try {
    const devices = await Device.find({
      deletedAt: null,
      lifecycle: { $in: ['active', 'maintenance'] },
      $or: [{ 'protocols.snmpV2c': true }, { 'protocols.snmpV3': true }],
    }).lean();

    for (const device of devices) {
      let credentialPayload = {};
      const credentialId = device.protocolSettings?.snmp?.credentialId || device.credentialProfileIds?.[0];
      if (credentialId) {
        const credential = await Credential.findOne({ _id: credentialId, deletedAt: null }).lean();
        if (credential) credentialPayload = decryptJson(credential.encryptedPayload);
      }

      const result = await collectSnmpMetrics(device, credentialPayload);
      let state = await DeviceState.findOne({ deviceId: device._id });
      if (!state) state = await DeviceState.create({ deviceId: device._id, status: 'unknown' });

      state.snmpReachable = result.ok;
      state.lastTelemetryAt = new Date();
      if (result.sysName) state.sysName = result.sysName;
      if (Number.isFinite(result.uptimeSec)) state.uptimeSec = result.uptimeSec;

      if (!result.ok) {
        await createOrUpdateAlert(device, 'snmp_unreachable', {
          ruleId: 'rule_snmp_unreachable',
          title: 'SNMP Unreachable',
          titleVi: 'Không kết nối được SNMP',
          description: result.error,
          descriptionVi: result.error,
          severity: 'warning',
          metric: 'snmp_reachable',
          currentValue: 0,
        });
      } else {
        // Auto-resolve unreachable if back
        await autoResolveAlert(device, 'snmp_unreachable');
      }

      // Store interface data on DeviceState
      if (result.interfaces?.length) {
        state.interfaces = result.interfaces.map((iface) => ({
          index: iface.index,
          name: iface.name,
          status: iface.status,
          inOctets: iface.inOctets,
          outOctets: iface.outOctets,
          inErrors: iface.inErrors,
          outErrors: iface.outErrors,
          updatedAt: new Date(),
        }));
      }

      for (const sample of result.metrics || []) {
        await saveTelemetry(device, sample.metric, sample.value, sample.unit);

        // Update state with known metrics
        if (sample.metric === 'cpu_pct') state.cpuPct = sample.value;
        if (sample.metric === 'memory_pct') state.memoryPct = sample.value;
        if (sample.metric === 'sys_uptime_sec') state.uptimeSec = sample.value;

        // ── Alert: High CPU ──
        if (sample.metric === 'cpu_pct' && sample.value >= 90) {
          await createOrUpdateAlert(device, 'high_cpu', {
            ruleId: 'rule_high_cpu',
            title: 'High CPU',
            titleVi: 'CPU cao bất thường',
            severity: 'high',
            metric: 'cpu_pct',
            currentValue: sample.value,
            threshold: { operator: 'gte', value: 90 },
          });
        } else if (sample.metric === 'cpu_pct' && sample.value < 85) {
          await autoResolveAlert(device, 'high_cpu');
        }

        // ── Alert: High Memory ──
        if (sample.metric === 'memory_pct' && sample.value >= 90) {
          await createOrUpdateAlert(device, 'high_memory', {
            ruleId: 'rule_high_memory',
            title: 'High Memory',
            titleVi: 'RAM cao bất thường',
            severity: 'high',
            metric: 'memory_pct',
            currentValue: sample.value,
            threshold: { operator: 'gte', value: 90 },
          });
        } else if (sample.metric === 'memory_pct' && sample.value < 85) {
          await autoResolveAlert(device, 'high_memory');
        }

        // ── Alert: Interface Down ──
        if (sample.metric === 'if_down_count' && sample.value > 0) {
          await createOrUpdateAlert(device, 'interface_down', {
            ruleId: 'rule_interface_down',
            title: 'Interface(s) Down',
            titleVi: 'Có cổng mạng bị ngắt kết nối',
            severity: 'warning',
            metric: 'if_down_count',
            currentValue: sample.value,
            threshold: { operator: 'gt', value: 0 },
          });
        } else if (sample.metric === 'if_down_count' && sample.value === 0) {
          await autoResolveAlert(device, 'interface_down');
        }
      }

      await state.save();
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
            cpuPct: state.cpuPct,
            memoryPct: state.memoryPct,
            uptimeSec: state.uptimeSec,
            snmpReachable: state.snmpReachable,
            interfaceCount: state.interfaces?.length || 0,
            lastSeenAt: state.lastSeenAt,
          },
        });
      }
    }

    if (io && devices.length > 0) {
      io.emit('dashboard:summary.updated', { event: 'dashboard:summary.updated', data: { updatedAt: new Date() } });
    }
  } catch (error) {
    console.error('SNMP cycle error:', error.message);
  } finally {
    setGauge('worker_snmp_duration_ms', Date.now() - startedAt);
  }
};

module.exports = { runSnmpCycle, setIO };
