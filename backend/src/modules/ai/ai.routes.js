const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { authenticateToken } = require('../../middleware/auth');

// ── Protected Routes ──
router.post('/learning-path', authenticateToken, aiController.generateLearningPath);

module.exports = router;
