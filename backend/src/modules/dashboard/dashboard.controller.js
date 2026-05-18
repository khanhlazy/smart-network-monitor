const Device = require('../devices/device.model');
const DeviceState = require('../monitoring/deviceState.model');
const Alert = require('../alerts/alert.model');
const Collector = require('../collectors/collector.model');

exports.getSummary = async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments({ deletedAt: null, lifecycle: { $in: ['active', 'maintenance'] } });
    
    const states = await DeviceState.find().lean();
    const statusCounts = { online: 0, offline: 0, warning: 0, critical: 0, unknown: 0, maintenance: 0 };
    let totalLatency = 0;
    let latencyCount = 0;
    let totalPacketLoss = 0;
    let packetLossCount = 0;

    states.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      if (s.latencyMs !== null && s.latencyMs !== undefined) {
        totalLatency += s.latencyMs;
        latencyCount++;
      }
      totalPacketLoss += s.packetLossPct || 0;
      packetLossCount++;
    });

    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount * 10) / 10 : 0;
    const avgPacketLoss = packetLossCount > 0 ? Math.round(totalPacketLoss / packetLossCount * 100) / 100 : 0;

    const openAlerts = await Alert.countDocuments({ status: { $in: ['open', 'acknowledged'] } });
    const criticalAlerts = await Alert.countDocuments({ status: { $in: ['open', 'acknowledged'] }, severity: 'critical' });

    const activeCollectors = await Collector.countDocuments({ status: 'online' });

    // Calculate health score
    const onlineRatio = totalDevices > 0 ? statusCounts.online / totalDevices : 0;
    const latencyScore = avgLatency <= 50 ? 100 : avgLatency <= 100 ? 75 : avgLatency <= 200 ? 50 : 25;
    const packetLossScore = avgPacketLoss <= 1 ? 100 : avgPacketLoss <= 5 ? 75 : avgPacketLoss <= 10 ? 50 : 25;
    const alertScore = openAlerts === 0 ? 100 : openAlerts <= 5 ? 75 : openAlerts <= 15 ? 50 : 25;
    const collectorScore = activeCollectors > 0 ? 100 : 0;

    const healthScore = totalDevices === 0 ? 0 : Math.round(
      onlineRatio * 35 +
      (latencyScore / 100) * 20 +
      (packetLossScore / 100) * 20 +
      (alertScore / 100) * 15 +
      (collectorScore / 100) * 10
    );

    res.json({
      data: {
        totalDevices,
        onlineDevices: statusCounts.online,
        offlineDevices: statusCounts.offline,
        warningDevices: statusCounts.warning + statusCounts.critical,
        openAlerts,
        criticalAlerts,
        avgLatency,
        avgPacketLoss,
        healthScore,
        activeCollectors,
        statusDistribution: statusCounts,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.getHealth = async (req, res) => {
  try {
    const states = await DeviceState.find().lean();
    const healthBands = { good: 0, stable: 0, attention: 0, degraded: 0, critical: 0 };

    states.forEach(s => {
      const score = s.healthScore || 0;
      if (score >= 90) healthBands.good++;
      else if (score >= 75) healthBands.stable++;
      else if (score >= 60) healthBands.attention++;
      else if (score >= 40) healthBands.degraded++;
      else healthBands.critical++;
    });

    res.json({ data: healthBands });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};

exports.getTraffic = async (req, res) => {
  // Placeholder for traffic data - will be populated by SNMP in future
  const now = Date.now();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    data.push({
      timestamp: new Date(now - i * 3600000),
      inbound: Math.random() * 800 + 200,
      outbound: Math.random() * 600 + 100,
    });
  }
  res.json({ data });
};

exports.getLatencyTrend = async (req, res) => {
  try {
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 3600000);
    
    const TelemetrySample = require('../telemetry/telemetrySample.model');
    
    const results = await TelemetrySample.aggregate([
      { $match: { metric: 'latency_ms', sampledAt: { $gte: past24h } } },
      {
        $group: {
          _id: {
            year: { $year: "$sampledAt" },
            month: { $month: "$sampledAt" },
            day: { $dayOfMonth: "$sampledAt" },
            hour: { $hour: "$sampledAt" }
          },
          avgLatency: { $avg: "$value" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);
    
    const dataMap = new Map();
    results.forEach(r => {
      const d = new Date(r._id.year, r._id.month - 1, r._id.day, r._id.hour);
      dataMap.set(d.getTime(), r.avgLatency);
    });

    const data = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      d.setMinutes(0, 0, 0);
      data.push({
        time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        latency: Math.round(dataMap.get(d.getTime()) || 0)
      });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.' } });
  }
};
