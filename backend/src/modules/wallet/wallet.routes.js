const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema } = require('../auth/auth.validation');

const transactionQuerySchema = paginationSchema.extend({
  type: z.enum(['credit', 'debit', 'reserve', 'release', 'refund', 'topup', 'platform_fee', 'welcome', 'dispute', 'expiry']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
});

const topUpSchema = z.object({
  user_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  amount: z.number().int().min(1).max(10000),
  reason: z.string().max(200).optional(),
});

// ── User Routes ──
router.get('/', authenticateToken, walletController.getWallet);
router.get(
  '/transactions',
  authenticateToken,
  validate({ query: transactionQuerySchema }),
  walletController.getTransactions
);

// ── Admin Routes ──
router.post(
  '/topup',
  authenticateToken,
  requireRole('admin'),
  validate({ body: topUpSchema }),
  walletController.adminTopUp
);
// ── Dispute Routes ──
const disputeSchema = z.object({
  session_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  reason: z.string().max(500).optional(),
});

const resolveDisputeSchema = z.object({
  session_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  resolution: z.enum(['full_refund', 'partial_refund', 'no_refund']),
  refund_percent: z.number().int().min(0).max(100).optional(),
});

router.post(
  '/dispute',
  authenticateToken,
  validate({ body: disputeSchema }),
  walletController.raiseDispute
);

router.post(
  '/dispute/resolve',
  authenticateToken,
  requireRole('admin'),
  validate({ body: resolveDisputeSchema }),
  walletController.resolveDispute
);

module.exports = router;
