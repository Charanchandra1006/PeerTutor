const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validator');
const { z } = require('zod');
const { paginationSchema } = require('../auth/auth.validation');

const transactionQuerySchema = paginationSchema.extend({
  type: z.enum(['credit', 'debit', 'reserve', 'release', 'refund', 'topup', 'platform_fee', 'welcome']).optional(),
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

module.exports = router;
