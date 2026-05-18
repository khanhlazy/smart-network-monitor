const metrics = {
  counters: {
    http_requests_total: {},
    alerts_created_total: 0,
    telemetry_samples_total: 0,
  },
  gauges: {
    socket_connected_clients: 0,
    worker_ping_duration_ms: 0,
    worker_snmp_duration_ms: 0,
    collector_heartbeat_age_seconds: 0,
    mongodb_connection_status: 0,
    redis_connection_status: 0,
  },
  histograms: {
    http_request_duration_seconds: [],
  },
};

const labelKey = (labels = {}) => Object.entries(labels)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
  .join(',');

const incHttpRequest = (labels) => {
  const key = labelKey(labels);
  metrics.counters.http_requests_total[key] = (metrics.counters.http_requests_total[key] || 0) + 1;
};

const observeHttpDuration = (seconds, labels) => {
  metrics.histograms.http_request_duration_seconds.push({ seconds, labels });
  if (metrics.histograms.http_request_duration_seconds.length > 1000) {
    metrics.histograms.http_request_duration_seconds.shift();
  }
};

const incCounter = (name, value = 1) => {
  metrics.counters[name] = (metrics.counters[name] || 0) + value;
};

const setGauge = (name, value) => {
  metrics.gauges[name] = Number.isFinite(value) ? value : 0;
};

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path || 'unknown';
    const labels = { method: req.method, route, status: res.statusCode };
    incHttpRequest(labels);
    observeHttpDuration(durationSeconds, labels);
  });
  next();
};

const renderPrometheus = () => {
  const lines = [];

  lines.push('# TYPE http_requests_total counter');
  Object.entries(metrics.counters.http_requests_total).forEach(([labels, value]) => {
    lines.push(`http_requests_total{${labels}} ${value}`);
  });

  lines.push('# TYPE http_request_duration_seconds gauge');
  const recent = metrics.histograms.http_request_duration_seconds.slice(-200);
  const avg = recent.length ? recent.reduce((sum, item) => sum + item.seconds, 0) / recent.length : 0;
  lines.push(`http_request_duration_seconds ${avg}`);

  Object.entries(metrics.counters).forEach(([name, value]) => {
    if (name === 'http_requests_total') return;
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  });

  Object.entries(metrics.gauges).forEach(([name, value]) => {
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  });

  return `${lines.join('\n')}\n`;
};

module.exports = {
  metrics,
  metricsMiddleware,
  renderPrometheus,
  incCounter,
  setGauge,
};
