const express = require('express');
const router = express.Router();
const groupSessionController = require('./group-session.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireTutor } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema, idParamSchema } = require('../auth/auth.validation');

// ── Validation Schemas ──

const createGroupSessionSchema = z.object({
  subject_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().refine(v => [30, 60, 90].includes(v), 'Duration must be 30, 60, or 90 minutes'),
  max_participants: z.number().int().min(2).max(50).optional(),
});

const discoverQuerySchema = paginationSchema.extend({
  subject_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  sort_by: z.enum(['date', 'price_low', 'price_high', 'seats']).optional(),
});

const attendanceSchema = z.object({
  action: z.enum(['join', 'leave']),
});

const uploadMaterialSchema = z.object({
  title: z.string().min(1).max(200),
  file_url: z.string().url(),
});

// ── All routes require authentication ──
router.use(authenticateToken);

// ── Discovery (all authenticated users) ──
router.get(
  '/',
  validate({ query: discoverQuerySchema }),
  groupSessionController.discover
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  groupSessionController.getById
);

router.get(
  '/:id/participants',
  validate({ params: idParamSchema }),
  groupSessionController.getParticipants
);

// ── Create (tutor only) ──
router.post(
  '/',
  requireTutor,
  validate({ body: createGroupSessionSchema }),
  groupSessionController.create
);

// ── Student actions ──
router.post(
  '/:id/join',
  validate({ params: idParamSchema }),
  groupSessionController.join
);

router.post(
  '/:id/leave',
  validate({ params: idParamSchema }),
  groupSessionController.leave
);

router.post(
  '/:id/attendance',
  validate({ params: idParamSchema, body: attendanceSchema }),
  groupSessionController.recordAttendance
);

// ── Tutor actions ──
router.post(
  '/:id/complete',
  validate({ params: idParamSchema }),
  groupSessionController.complete
);

router.post(
  '/:id/materials',
  validate({ params: idParamSchema, body: uploadMaterialSchema }),
  groupSessionController.uploadMaterial
);

module.exports = router;
