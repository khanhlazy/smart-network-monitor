const Device = require('../modules/devices/device.model');
const DeviceState = require('../modules/monitoring/deviceState.model');
const TelemetrySample = require('../modules/telemetry/telemetrySample.model');
const Alert = require('../modules/alerts/alert.model');
const Credential = require('../modules/credentials/credential.model');
const { runSshCommands } = require('../modules/collectors/ssh/ssh.service');
const { decryptJson } = require('../utils/crypto');
const { incCounter } = require('../utils/metrics');
const { dispatchAlertNotifications } = require('../modules/notifications/notification.service');

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const createSshAlert = async (device, key, title, titleVi, description) => {
  const dedupKey = `${key}:${device._id}`;
  const existing = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });
  if (existing) {
    existing.occurrenceCount += 1;
    existing.lastOccurredAt = new Date();
    await existing.save();
    return existing;
  }

  const alert = await Alert.create({
    ruleId: `rule_${key}`,
    deviceId: device._id,
    siteId: device.siteId,
    title,
    titleVi,
    description,
    descriptionVi: description,
    severity: key.includes('auth') ? 'high' : 'warning',
    status: 'open',
    metric: 'ssh_reachable',
    currentValue: 0,
    dedupKey,
  });
  if (io) io.emit('alert:created', { event: 'alert:created', data: alert });
  incCounter('alerts_created_total');
  dispatchAlertNotifications(alert);
  return alert;
};

const runSshCycle = async () => {
  try {
    const devices = await Device.find({
      deletedAt: null,
      lifecycle: { $in: ['active', 'maintenance'] },
      'protocols.ssh': true,
    }).lean();

    for (const device of devices) {
      const credentialId = device.protocolSettings?.ssh?.credentialId || device.credentialProfileIds?.[0];
      let credentialPayload = {};
      if (credentialId) {
        const credential = await Credential.findOne({ _id: credentialId, deletedAt: null }).lean();
        if (credential) credentialPayload = decryptJson(credential.encryptedPayload);
      }

      const result = await runSshCommands(device, credentialPayload);
      let state = await DeviceState.findOne({ deviceId: device._id });
      if (!state) state = await DeviceState.create({ deviceId: device._id, status: 'unknown' });
      state.sshReachable = result.ok;
      state.lastTelemetryAt = new Date();

      if (!result.ok) {
        const lower = String(result.error || '').toLowerCase();
        const key = lower.includes('auth') || lower.includes('password') ? 'ssh_authentication_failed'
          : lower.includes('timeout') ? 'ssh_command_timeout'
            : 'ssh_unreachable';
        await createSshAlert(
          device,
          key,
          key === 'ssh_authentication_failed' ? 'SSH Authentication Failed' : key === 'ssh_command_timeout' ? 'SSH Command Timeout' : 'SSH Unreachable',
          key === 'ssh_authentication_failed' ? 'Xác thực SSH thất bại' : key === 'ssh_command_timeout' ? 'Lệnh SSH quá thời gian' : 'Không kết nối được SSH',
          result.error
        );
      }

      for (const sample of result.metrics || []) {
        if (!Number.isFinite(sample.value)) continue;
        await TelemetrySample.create({
          deviceId: device._id,
          siteId: device.siteId,
          metric: sample.metric,
          protocol: 'ssh',
          value: sample.value,
          unit: sample.unit,
          collectorId: device.collectorId,
          sampledAt: new Date(),
        });
        incCounter('telemetry_samples_total');
        if (sample.metric === 'memory_pct') state.memoryPct = sample.value;
      }

      await state.save();
      if (io) {
        io.emit('device:state.updated', {
          event: 'device:state.updated',
          data: {
            deviceId: device._id,
            name: device.name,
            status: state.status,
            healthScore: state.healthScore,
            memoryPct: state.memoryPct,
          },
        });
      }
    }
  } catch (error) {
    console.error('SSH cycle error:', error.message);
  }
};

module.exports = { runSshCycle, setIO };
