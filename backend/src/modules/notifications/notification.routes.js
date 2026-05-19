const express = require('express');
const router = express.Router();
const notifController = require('./notification.controller');
const { authenticateToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validator');
const { paginationSchema, idParamSchema } = require('../auth/auth.validation');

router.use(authenticateToken);

router.get('/', validate({ query: paginationSchema }), notifController.getNotifications);
router.get('/unread-count', notifController.getUnreadCount);
router.patch('/:id/read', validate({ params: idParamSchema }), notifController.markRead);
router.patch('/read-all', notifController.markAllRead);

module.exports = router;
