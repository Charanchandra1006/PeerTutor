const express = require('express');
const router = express.Router();
const tutorController = require('./tutor.controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { requireTutor, requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const {
  createTutorProfileSchema,
  updateTutorProfileSchema,
  updateAvailabilitySchema,
  searchTutorsSchema,
  createSubjectSchema,
} = require('./tutor.validation');
const { idParamSchema } = require('../auth/auth.validation');

// ── Public Routes ──
router.get(
  '/',
  optionalAuth,
  validate({ query: searchTutorsSchema }),
  tutorController.searchTutors
);

router.post(
  '/match',
  authenticateToken,
  tutorController.matchTutors
);

router.get(
  '/subjects',
  tutorController.listSubjects
);

router.get(
  '/resources',
  optionalAuth,
  tutorController.searchResources
);

router.get(
  '/:id',
  optionalAuth,
  validate({ params: idParamSchema }),
  tutorController.getProfile
);

// ── Tutor Protected Routes ──
router.post(
  '/profile',
  authenticateToken,
  validate({ body: createTutorProfileSchema }),
  tutorController.createProfile
);

router.patch(
  '/profile',
  authenticateToken,
  requireTutor,
  validate({ body: updateTutorProfileSchema }),
  tutorController.updateProfile
);

router.get(
  '/profile/me',
  authenticateToken,
  requireTutor,
  tutorController.getMyProfile
);

router.patch(
  '/availability',
  authenticateToken,
  requireTutor,
  validate({ body: updateAvailabilitySchema }),
  tutorController.updateAvailability
);

router.post(
  '/portfolio',
  authenticateToken,
  requireTutor,
  tutorController.addPortfolioItem
);

router.post(
  '/resources',
  authenticateToken,
  requireTutor,
  tutorController.addResource
);

// ── Admin: Subject Management ──
router.post(
  '/subjects',
  authenticateToken,
  requireRole('admin'),
  validate({ body: createSubjectSchema }),
  tutorController.createSubject
);

router.patch(
  '/subjects/:id',
  authenticateToken,
  requireRole('admin'),
  tutorController.updateSubject
);

router.delete(
  '/subjects/:id',
  authenticateToken,
  requireRole('admin'),
  tutorController.deleteSubject
);

module.exports = router;
