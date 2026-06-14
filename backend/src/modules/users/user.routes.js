const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { updateProfileSchema, paginationSchema, idParamSchema } = require('../auth/auth.validation');

// ── Public Routes ──
router.get('/leaderboard', optionalAuth, userController.getLeaderboard);

// ── Protected Routes ──
router.get('/me', authenticateToken, userController.getProfile);
router.patch(
  '/me',
  authenticateToken,
  validate({ body: updateProfileSchema }),
  userController.updateProfile
);
router.get('/saved-tutors', authenticateToken, userController.getSavedTutors);
router.post('/save-tutor/:tutorId', authenticateToken, userController.toggleSaveTutor);
router.get('/recently-viewed', authenticateToken, userController.getRecentlyViewed);
router.post('/recently-viewed/:tutorId', authenticateToken, userController.addRecentView);

// ── Admin Routes ──
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  validate({ query: paginationSchema }),
  userController.listUsers
);

module.exports = router;
