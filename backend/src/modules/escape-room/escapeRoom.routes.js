const express = require('express');
const router = express.Router();
const escapeRoomController = require('./escapeRoom.controller');
const { authenticateToken } = require('../../middleware/auth');

router.use(authenticateToken);

router.get('/rooms', escapeRoomController.getRooms);
router.get('/rooms/:id', escapeRoomController.getRoomById);
router.post('/rooms/:id/start', escapeRoomController.startAttempt);

router.get('/attempts/my', escapeRoomController.getMyAttempts);
router.get('/attempts/:id', escapeRoomController.getAttempt);
router.post('/attempts/:id/hint', escapeRoomController.requestHint);
router.post('/attempts/:id/submit-puzzle', escapeRoomController.submitPuzzle);

module.exports = router;
