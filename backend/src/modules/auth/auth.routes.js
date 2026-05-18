const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/', authenticate, authController.getMe);
router.patch('/preferences', authenticate, authController.updatePreferences);
router.get('/me', authenticate, authController.getMe);
router.patch('/me/preferences', authenticate, authController.updatePreferences);

module.exports = router;
