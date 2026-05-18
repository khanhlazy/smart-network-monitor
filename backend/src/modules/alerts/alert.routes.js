const express = require('express');
const router = express.Router();
const alertController = require('./alert.controller');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('alert:read', 'device:read', '*'), alertController.list);
router.get('/:id', authorize('alert:read', 'device:read', '*'), alertController.getById);
router.post('/:id/acknowledge', authorize('alert:acknowledge', '*'), alertController.acknowledge);
router.post('/:id/resolve', authorize('alert:resolve', '*'), alertController.resolve);
router.post('/:id/suppress', authorize('alert:resolve', '*'), alertController.suppress);

module.exports = router;
