const express = require('express');
const router = express.Router();
const { User } = require('../auth/auth.model');
const { TutorProfile } = require('../tutors/tutor.model');
const { Session } = require('../bookings/booking.model');
const { Transaction, Wallet } = require('../wallet/wallet.model');
const apiResponse = require('../../utils/apiResponse');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

// All admin routes require admin role
router.use(authenticateToken, requireRole('admin'));

// ── Dashboard Stats ──
router.get('/stats', async (req, res) => {
  const [
    totalUsers,
    totalTutors,
    totalSessions,
    totalTransactions,
  ] = await Promise.all([
    User.countDocuments(),
    TutorProfile.countDocuments(),
    Session.countDocuments(),
    Transaction.countDocuments(),
  ]);

  const stats = {
    totalUsers,
    totalTutors,
    totalSessions,
    totalTransactions,
  };

  return apiResponse.success(res, stats);
});

// ── Users Management ──
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().select('-password_hash').sort({ created_at: -1 }).skip(skip).limit(limit),
    User.countDocuments()
  ]);

  return apiResponse.paginated(res, users, page, limit, total);
});

router.patch('/users/:id/status', async (req, res) => {
  const { is_active } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { is_active }, { new: true }).select('-password_hash');
  if (!user) return apiResponse.error(res, 'User not found', 404);
  return apiResponse.success(res, user);
});

// ── Transactions ──
router.get('/transactions', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find().sort({ created_at: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments()
  ]);

  return apiResponse.paginated(res, transactions, page, limit, total);
});

module.exports = router;
