const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/summary', dashboardController.getSummary);
router.get('/health', dashboardController.getHealth);
router.get('/traffic', dashboardController.getTraffic);
router.get('/latency', dashboardController.getLatencyTrend);

module.exports = router;
