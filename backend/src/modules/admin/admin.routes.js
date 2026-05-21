const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

// All admin routes require admin role
router.use(authenticateToken, requireRole('admin'));

// ── Dashboard Stats ──
router.get('/stats', adminController.getStats);

// ── Users Management ──
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/topup', adminController.topUpCredits);

// ── Transactions ──
router.get('/transactions', adminController.getTransactions);

// ── Sessions ──
router.get('/sessions', adminController.getSessions);

// ── Subjects ──
router.post('/subjects', adminController.createSubject);

// ── Audit Logs ──
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
