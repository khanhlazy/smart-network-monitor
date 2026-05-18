const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const connectDB = require('./database/connection');
const setupSocket = require('./sockets');
const { runMonitoringCycle, setIO } = require('./workers/pingWorker');
const { runSnmpCycle, setIO: setSnmpIO } = require('./workers/snmpWorker');
const { runSshCycle, setIO: setSshIO } = require('./workers/sshWorker');
const { runAnomalyCycle, setIO: setAnomalyIO } = require('./workers/anomalyWorker');
const { initOpenTelemetry } = require('./otel');

const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocket(io);
app.set('io', io);
setIO(io);
setSnmpIO(io);
setSshIO(io);
setAnomalyIO(io);

// Start server
const start = async () => {
  initOpenTelemetry();
  await connectDB();

  server.listen(config.port, () => {
    console.log(`\n[SmartNMS] Backend running on port ${config.port}`);
    console.log(`[Socket.IO] Ready`);
    console.log(`[Environment] ${config.nodeEnv}`);
    console.log(`[API] http://localhost:${config.port}/api/v1\n`);
  });

  // Start monitoring worker
  console.log(`[Worker] Starting monitoring worker (interval: ${config.monitoring.pingIntervalMs}ms)`);
  setInterval(runMonitoringCycle, config.monitoring.pingIntervalMs);

  if (config.snmp.enabled) {
    console.log(`Starting SNMP worker (interval: ${config.snmp.intervalMs}ms)`);
    setInterval(runSnmpCycle, config.snmp.intervalMs);
    setTimeout(runSnmpCycle, 10000);
  }

  if (config.ssh.enabled) {
    console.log(`Starting SSH worker (interval: ${config.ssh.intervalMs}ms)`);
    setInterval(runSshCycle, config.ssh.intervalMs);
    setTimeout(runSshCycle, 15000);
  }

  if (config.anomaly.enabled) {
    console.log(`Starting anomaly worker (interval: ${config.anomaly.intervalMs}ms)`);
    setInterval(runAnomalyCycle, config.anomaly.intervalMs);
    setTimeout(runAnomalyCycle, 20000);
  }

  // Run first cycle after 5 seconds
  setTimeout(runMonitoringCycle, 5000);
};

start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});
