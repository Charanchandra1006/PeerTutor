const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema, idParamSchema } = require('../auth/auth.validation');

// All admin routes require admin role
router.use(authenticateToken, requireRole('admin'));

// ── Dashboard Stats ──
router.get('/stats', adminController.getStats);

// ── System Health ──
router.get('/health', adminController.getSystemHealth);

// ── Users Management ──
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/topup', adminController.topUpCredits);

// ── Transactions ──
router.get('/transactions', adminController.getTransactions);
router.get('/export/transactions', adminController.exportTransactions);

// ── Sessions ──
router.get('/sessions', adminController.getSessions);

// ── Subjects ──
router.post('/subjects', adminController.createSubject);

// ── Audit Logs ──
router.get('/audit-logs', adminController.getAuditLogs);

// ── Broadcast ──
const broadcastSchema = z.object({
  audience: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
});

router.post(
  '/broadcast',
  validate({ body: broadcastSchema }),
  adminController.broadcastAnnouncement
);

// ── Review Moderation ──
router.get(
  '/reviews/moderation',
  validate({ query: paginationSchema }),
  adminController.getModerationQueue
);

const moderateSchema = z.object({
  is_approved: z.boolean(),
  mod_note: z.string().max(200).optional(),
});

router.patch(
  '/reviews/:id/moderate',
  validate({ params: idParamSchema, body: moderateSchema }),
  adminController.moderateReview
);

module.exports = router;
