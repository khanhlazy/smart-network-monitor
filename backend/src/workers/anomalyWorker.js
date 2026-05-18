const Device = require('../modules/devices/device.model');
const TelemetrySample = require('../modules/telemetry/telemetrySample.model');
const Alert = require('../modules/alerts/alert.model');
const AnomalyEvent = require('../modules/anomaly/anomalyEvent.model');
const config = require('../config');
const { incCounter } = require('../utils/metrics');
const { dispatchAlertNotifications } = require('../modules/notifications/notification.service');

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const stddev = (values, avg) => Math.sqrt(values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length);

const severityFromScore = (score) => {
  if (score >= 5) return 'critical';
  if (score >= 4) return 'high';
  if (score >= 3) return 'warning';
  return 'info';
};

const runAnomalyCycle = async () => {
  if (!config.anomaly.enabled) return;
  try {
    const devices = await Device.find({ deletedAt: null, lifecycle: { $in: ['active', 'maintenance'] } }).lean();
    const metrics = ['latency_ms', 'packet_loss_pct', 'interface_utilization', 'error_rate', 'traffic_bps'];

    for (const device of devices) {
      for (const metric of metrics) {
        const samples = await TelemetrySample.find({
          deviceId: device._id,
          metric,
          value: { $type: 'number' },
        }).sort({ sampledAt: -1 }).limit(60).lean();

        if (samples.length < config.anomaly.minSamples) continue;
        const values = samples.map(sample => sample.value).filter(Number.isFinite);
        if (values.length < config.anomaly.minSamples) continue;

        const currentValue = values[0];
        const baseline = values.slice(1);
        const avg = mean(baseline);
        const sd = stddev(baseline, avg);
        if (!Number.isFinite(currentValue) || !Number.isFinite(avg) || sd === 0) continue;

        const score = Math.abs((currentValue - avg) / sd);
        if (score < config.anomaly.zScoreThreshold) continue;

        const severity = severityFromScore(score);
        const explanation = `${metric} hiện tại ${currentValue} lệch khỏi nền ${Math.round(avg * 100) / 100} với z-score ${Math.round(score * 100) / 100}.`;

        const anomaly = await AnomalyEvent.create({
          deviceId: device._id,
          metric,
          currentValue,
          baselineValue: avg,
          anomalyScore: score,
          model: 'rolling_zscore',
          severity,
          explanation,
        });

        const dedupKey = `anomaly:${device._id}:${metric}`;
        const existingAlert = await Alert.findOne({ dedupKey, status: { $in: ['open', 'acknowledged'] } });
        if (!existingAlert) {
          const alert = await Alert.create({
            ruleId: 'rule_anomaly_detection',
            deviceId: device._id,
            siteId: device.siteId,
            title: 'Anomaly detected',
            titleVi: 'Phát hiện bất thường',
            description: explanation,
            descriptionVi: explanation,
            severity,
            status: 'open',
            metric,
            currentValue,
            threshold: { operator: 'zscore', value: config.anomaly.zScoreThreshold },
            dedupKey,
          });

          if (io) {
            io.emit('alert:created', { event: 'alert:created', data: alert });
            io.emit('dashboard:summary.updated', { event: 'dashboard:summary.updated', data: { updatedAt: new Date() } });
          }
          incCounter('alerts_created_total');
          dispatchAlertNotifications(alert);
        }

        if (io) {
          io.emit('anomaly:created', { event: 'anomaly:created', data: anomaly });
        }
      }
    }
  } catch (error) {
    console.error('Anomaly cycle error:', error.message);
  }
};

module.exports = { runAnomalyCycle, setIO };
