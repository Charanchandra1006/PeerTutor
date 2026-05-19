const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireStudent, requireTutor } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema, idParamSchema } = require('../auth/auth.validation');

const createBookingSchema = z.object({
  tutor_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  subject_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().refine(v => [30, 60, 90].includes(v), 'Duration must be 30, 60, or 90 minutes'),
  help_description: z.string().max(500).optional(),
  is_group_session: z.boolean().optional().default(false),
});

const cancelBookingSchema = z.object({
  reason: z.string().max(200).optional(),
});

const saveNotesSchema = z.object({
  content: z.string().max(50000), // Rich text can be large
});

const bookingQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

// ── All routes require authentication ──
router.use(authenticateToken);

router.post(
  '/',
  validate({ body: createBookingSchema }),
  bookingController.createBooking
);

router.get(
  '/',
  validate({ query: bookingQuerySchema }),
  bookingController.getUserBookings
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  bookingController.getById
);

router.patch(
  '/:id/cancel',
  validate({ params: idParamSchema, body: cancelBookingSchema }),
  bookingController.cancelBooking
);

router.post(
  '/:id/join',
  validate({ params: idParamSchema }),
  bookingController.joinGroupSession
);

// ── Session-specific routes ──
router.post(
  '/:id/complete',
  validate({ params: idParamSchema }),
  bookingController.completeSession
);

router.post(
  '/:id/notes',
  validate({ params: idParamSchema, body: saveNotesSchema }),
  bookingController.saveNotes
);

router.get(
  '/:id/video-link',
  validate({ params: idParamSchema }),
  bookingController.getVideoLink
);

module.exports = router;
