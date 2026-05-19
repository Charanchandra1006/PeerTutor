const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema, idParamSchema } = require('../auth/auth.validation');

const submitReviewSchema = z.object({
  session_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const moderateReviewSchema = z.object({
  is_approved: z.boolean(),
  mod_note: z.string().max(200).optional(),
});

// ── Protected Routes ──
router.post(
  '/',
  authenticateToken,
  validate({ body: submitReviewSchema }),
  reviewController.submitReview
);

router.get('/pending', authenticateToken, reviewController.getPendingReviews);

router.get(
  '/user/:id',
  validate({ params: idParamSchema, query: paginationSchema }),
  reviewController.getReviewsForTutor
);

// ── Admin Routes ──
router.get(
  '/moderation',
  authenticateToken,
  requireRole('admin'),
  validate({ query: paginationSchema }),
  reviewController.getModerationQueue
);

router.patch(
  '/:id/moderate',
  authenticateToken,
  requireRole('admin'),
  validate({ params: idParamSchema, body: moderateReviewSchema }),
  reviewController.moderateReview
);

module.exports = router;
