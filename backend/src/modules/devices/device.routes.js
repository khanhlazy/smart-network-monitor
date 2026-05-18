const express = require('express');
const router = express.Router();
const deviceController = require('./device.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('device:read', '*'), deviceController.list);
router.post('/', authorize('device:create', '*'), deviceController.create);
router.post('/bulk', authorize('device:create', '*'), deviceController.bulkCreate);
router.post('/import', authorize('device:create', '*'), deviceController.importDevices);
router.get('/export.csv', authorize('device:read', '*'), deviceController.exportCsv);
router.get('/topology', authorize('device:read', '*'), deviceController.getTopology);
router.post('/topology', authorize('device:update', '*'), deviceController.saveTopology);
router.get('/:id', authorize('device:read', '*'), deviceController.getById);
router.patch('/:id', authorize('device:update', '*'), deviceController.update);
router.delete('/:id', authorize('device:delete', '*'), deviceController.remove);
router.post('/:id/poll', authorize('device:update', '*'), deviceController.pollDevice);
router.get('/:id/telemetry', authorize('device:read', '*'), deviceController.getTelemetry);

module.exports = router;
