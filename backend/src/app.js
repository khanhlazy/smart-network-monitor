const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const deviceRoutes = require('./modules/devices/device.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const alertRoutes = require('./modules/alerts/alert.routes');
const alertRuleRoutes = require('./modules/alerts/alertRule.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const userRoutes = require('./modules/users/user.routes');
const roleRoutes = require('./modules/roles/role.routes');
const credentialRoutes = require('./modules/credentials/credential.routes');
const topologyRoutes = require('./modules/topology/topology.routes');
const incidentRoutes = require('./modules/incidents/incident.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const reportRoutes = require('./modules/reports/report.routes');
const mfaRoutes = require('./modules/mfa/mfa.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const anomalyRoutes = require('./modules/anomaly/anomaly.routes');
const collectorRoutes = require('./modules/collectors/collector.routes');
const { metricsMiddleware, renderPrometheus } = require('./utils/metrics');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } },
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: 'RATE_LIMIT', message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.' } },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use(metricsMiddleware);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() });
});

app.get('/api/v1/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderPrometheus());
});

// API routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/me', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/alert-rules', alertRuleRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/topology', topologyRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/maintenance-windows', maintenanceRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/mfa', mfaRoutes);
app.use('/api/v1/notification-channels', notificationRoutes);
app.use('/api/v1/anomaly', anomalyRoutes);
app.use('/api/v1/collectors', collectorRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint không tồn tại.' } });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' ? 'Lỗi hệ thống.' : err.message,
    },
  });
});

module.exports = app;
