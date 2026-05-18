const mongoose = require('mongoose');
const config = require('../config');
const { setGauge } = require('../utils/metrics');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    setGauge('mongodb_connection_status', 1);
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    setGauge('mongodb_connection_status', 0);
    console.error('[MongoDB] Connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
