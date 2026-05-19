const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { updateProfileSchema, paginationSchema, idParamSchema } = require('../auth/auth.validation');

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

// ── Admin Routes ──
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  validate({ query: paginationSchema }),
  userController.listUsers
);

module.exports = router;
