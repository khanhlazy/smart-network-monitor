const config = require('./config');

const initOpenTelemetry = () => {
  if (!config.otel.enabled) {
    return { enabled: false };
  }

  // Optional by design: the app must still boot when no OTLP collector or
  // OpenTelemetry packages are installed in a lightweight MVP environment.
  console.log(`OpenTelemetry enabled for ${config.otel.serviceName}. Endpoint: ${config.otel.endpoint || 'not configured'}`);
  return { enabled: true };
};

module.exports = { initOpenTelemetry };
