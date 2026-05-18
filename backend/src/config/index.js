require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartnms',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  monitoring: {
    pingIntervalMs: parseInt(process.env.PING_INTERVAL_MS) || 30000,
    pingTimeoutMs: parseInt(process.env.PING_TIMEOUT_MS) || 5000,
    offlineFailureThreshold: parseInt(process.env.OFFLINE_FAILURE_THRESHOLD) || 3,
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-secret-key',
  },
  reports: {
    outputDir: process.env.REPORT_OUTPUT_DIR || 'storage/reports',
    ttlHours: parseInt(process.env.REPORT_TTL_HOURS) || 168,
  },
  snmp: {
    intervalMs: parseInt(process.env.SNMP_INTERVAL_MS) || 60000,
    enabled: process.env.SNMP_ENABLED !== 'false',
  },
  ssh: {
    intervalMs: parseInt(process.env.SSH_INTERVAL_MS) || 120000,
    enabled: process.env.SSH_ENABLED !== 'false',
  },
  anomaly: {
    enabled: process.env.ANOMALY_ENABLED !== 'false',
    intervalMs: parseInt(process.env.ANOMALY_INTERVAL_MS) || 300000,
    minSamples: parseInt(process.env.ANOMALY_MIN_SAMPLES) || 12,
    zScoreThreshold: parseFloat(process.env.ANOMALY_ZSCORE_THRESHOLD) || 3,
  },
  otel: {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'smartnms-backend',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '',
  },
};
