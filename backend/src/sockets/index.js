const jwt = require('jsonwebtoken');
const config = require('../config');
const { setGauge } = require('../utils/metrics');

const setupSocket = (io) => {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Connected: ${socket.id} (user: ${socket.userId})`);

    // Join user room
    socket.join(`user:${socket.userId}`);
    setGauge('socket_connected_clients', io.engine.clientsCount || 0);

    // Dashboard subscription
    socket.on('dashboard:subscribe', (data) => {
      socket.join('dashboard:main');
      console.log(`[Socket.IO] ${socket.id} subscribed to dashboard`);
    });

    // Device detail subscription
    socket.on('device:subscribe', (data) => {
      if (data?.deviceId) {
        socket.join(`device:${data.deviceId}`);
        console.log(`[Socket.IO] ${socket.id} subscribed to device ${data.deviceId}`);
      }
    });

    // Alert subscription
    socket.on('alerts:subscribe', (data) => {
      socket.join('alerts:main');
      console.log(`[Socket.IO] ${socket.id} subscribed to alerts`);
    });

    socket.on('topology:subscribe', () => {
      socket.join('topology:main');
      console.log(`${socket.id} subscribed to topology`);
    });

    // Language preference change
    socket.on('language:changed', (data) => {
      console.log(`[Socket.IO] ${socket.id} changed language to ${data?.language}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${socket.id} (${reason})`);
      setGauge('socket_connected_clients', io.engine.clientsCount || 0);
    });
  });

  return io;
};

module.exports = setupSocket;
