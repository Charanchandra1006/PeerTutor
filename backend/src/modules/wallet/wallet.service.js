const mongoose = require('mongoose');
const { Wallet, Transaction } = require('./wallet.model');
const { AppError } = require('../../middleware/errorHandler');
const errorCodes = require('../../utils/errorCodes');
const logger = require('../../utils/logger');
const config = require('../../config/env');

class WalletService {
  /**
   * Create wallet for a new user with welcome credits
   */
  async createWallet(userId) {
    const welcomeCredits = config.business.welcomeCredits;

    const wallet = await Wallet.create({
      user_id: userId,
      balance: welcomeCredits,
    });

    // Create welcome credit transaction
    if (welcomeCredits > 0) {
      await Transaction.create({
        user_id: userId,
        type: 'welcome',
        amount: welcomeCredits,
        balance_after: welcomeCredits,
        reference_type: 'system',
        description: `Welcome bonus: ${welcomeCredits} credits`,
      });
    }

    logger.info('Wallet created', { userId, welcomeCredits });
    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getWallet(userId) {
    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return wallet;
  }

  /**
   * Get transaction history (paginated)
   */
  async getTransactions(userId, { page = 1, limit = 20, type, from_date, to_date }) {
    const filter = { user_id: userId };
    if (type) filter.type = type;
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) filter.created_at.$gte = new Date(from_date);
      if (to_date) filter.created_at.$lte = new Date(to_date);
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Reserve credits for a booking (escrow)
   * Uses MongoDB transaction for atomicity.
   */
  async reserveCredits(studentId, amount, sessionId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await Wallet.findOne({ user_id: studentId }).session(session);
      if (!wallet) {
        throw new AppError(errorCodes.WALLET_NOT_FOUND, 'Wallet not found', 404);
      }

      const availableBalance = wallet.balance - wallet.reserved_balance;
      if (availableBalance < amount) {
        throw new AppError(
          errorCodes.WALLET_INSUFFICIENT_BALANCE,
          `Insufficient credits. Available: ${availableBalance}, Required: ${amount}`,
          400
        );
      }

      // Reserve credits
      wallet.reserved_balance += amount;
      await wallet.save({ session });

      // Create reserve transaction
      await Transaction.create(
        [{
          user_id: studentId,
          type: 'reserve',
          amount,
          balance_after: wallet.balance - wallet.reserved_balance,
          reference_id: sessionId,
          reference_type: 'session',
          description: `Credits reserved for session booking`,
        }],
        { session }
      );

      await session.commitTransaction();
      logger.info('Credits reserved', { studentId, amount, sessionId });
      return wallet;
    } catch (error) {
      await session.abortTransaction();
      if (error.isOperational) throw error;
      logger.error('Reserve credits failed', { error: error.message, studentId, amount });
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Failed to reserve credits', 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Release credits after session completion
   * Student escrow → Tutor wallet (minus platform fee)
   * Uses MongoDB transaction for atomicity.
   */
  async releaseCredits(studentId, tutorId, amount, sessionId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const feePercent = config.business.platformFeePercent;
      const platformFee = Math.round(amount * (feePercent / 100));
      const tutorAmount = amount - platformFee;

      // 1. Remove from student's reserved balance and debit
      const studentWallet = await Wallet.findOne({ user_id: studentId }).session(session);
      if (!studentWallet) throw new AppError(errorCodes.WALLET_NOT_FOUND, 'Student wallet not found', 404);

      studentWallet.reserved_balance -= amount;
      studentWallet.balance -= amount;
      studentWallet.total_spent += amount;

      if (studentWallet.balance < 0) {
        throw new AppError(errorCodes.WALLET_NEGATIVE_BALANCE, 'Wallet balance cannot go negative', 400);
      }

      await studentWallet.save({ session });

      // 2. Credit tutor's wallet
      let tutorWallet = await Wallet.findOne({ user_id: tutorId }).session(session);
      if (!tutorWallet) {
        tutorWallet = await Wallet.create([{ user_id: tutorId, balance: 0 }], { session });
        tutorWallet = tutorWallet[0];
      }

      tutorWallet.balance += tutorAmount;
      tutorWallet.total_earned += tutorAmount;
      await tutorWallet.save({ session });

      // 3. Create transactions (append-only) — atomically
      await Transaction.create(
        [
          {
            user_id: studentId,
            type: 'debit',
            amount,
            balance_after: studentWallet.balance,
            reference_id: sessionId,
            reference_type: 'session',
            description: `Session completed — credits released`,
          },
          {
            user_id: tutorId,
            type: 'credit',
            amount: tutorAmount,
            balance_after: tutorWallet.balance,
            reference_id: sessionId,
            reference_type: 'session',
            description: `Session earnings (after ${feePercent}% fee)`,
          },
          {
            user_id: tutorId,
            type: 'platform_fee',
            amount: platformFee,
            balance_after: tutorWallet.balance,
            reference_id: sessionId,
            reference_type: 'session',
            description: `Platform fee: ${feePercent}%`,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      logger.info('Credits released', { studentId, tutorId, amount, tutorAmount, platformFee, sessionId });

      return { studentWallet, tutorWallet, platformFee, tutorAmount };
    } catch (error) {
      await session.abortTransaction();
      if (error.isOperational) throw error;
      logger.error('Release credits failed', { error: error.message });
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Failed to release credits', 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Refund credits on cancellation
   * > 2h notice: 100% refund to student
   * < 2h notice: 50% to student, 50% to tutor
   */
  async refundCredits(studentId, tutorId, amount, sessionId, isLateCancellation) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const studentWallet = await Wallet.findOne({ user_id: studentId }).session(session);
      if (!studentWallet) throw new AppError(errorCodes.WALLET_NOT_FOUND, 'Student wallet not found', 404);

      if (isLateCancellation) {
        // Late cancellation: 50/50 split
        const halfAmount = Math.floor(amount / 2);
        const studentRefund = amount - halfAmount;

        // Return half to student
        studentWallet.reserved_balance -= amount;
        studentWallet.balance -= halfAmount; // Only debit half
        await studentWallet.save({ session });

        // Give half to tutor
        let tutorWallet = await Wallet.findOne({ user_id: tutorId }).session(session);
        if (!tutorWallet) {
          tutorWallet = await Wallet.create([{ user_id: tutorId, balance: 0 }], { session });
          tutorWallet = tutorWallet[0];
        }
        tutorWallet.balance += halfAmount;
        tutorWallet.total_earned += halfAmount;
        await tutorWallet.save({ session });

        await Transaction.create(
          [
            {
              user_id: studentId,
              type: 'refund',
              amount: studentRefund,
              balance_after: studentWallet.balance,
              reference_id: sessionId,
              reference_type: 'session',
              description: 'Late cancellation — 50% refund',
            },
            {
              user_id: tutorId,
              type: 'credit',
              amount: halfAmount,
              balance_after: tutorWallet.balance,
              reference_id: sessionId,
              reference_type: 'session',
              description: 'Late cancellation compensation — 50%',
            },
          ],
          { session }
        );
      } else {
        // Full refund
        studentWallet.reserved_balance -= amount;
        await studentWallet.save({ session });

        await Transaction.create(
          [{
            user_id: studentId,
            type: 'release',
            amount,
            balance_after: studentWallet.balance - studentWallet.reserved_balance,
            reference_id: sessionId,
            reference_type: 'session',
            description: 'Booking cancelled — full refund',
          }],
          { session }
        );
      }

      await session.commitTransaction();
      logger.info('Credits refunded', { studentId, amount, isLateCancellation, sessionId });
    } catch (error) {
      await session.abortTransaction();
      if (error.isOperational) throw error;
      logger.error('Refund failed', { error: error.message });
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Failed to process refund', 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin top-up credits
   */
  async adminTopUp(userId, amount, adminId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let wallet = await Wallet.findOne({ user_id: userId }).session(session);
      if (!wallet) {
        wallet = await Wallet.create([{ user_id: userId, balance: 0 }], { session });
        wallet = wallet[0];
      }

      wallet.balance += amount;
      await wallet.save({ session });

      await Transaction.create(
        [{
          user_id: userId,
          type: 'topup',
          amount,
          balance_after: wallet.balance,
          reference_type: 'admin',
          description: `Admin top-up: ${reason || 'No reason provided'}`,
        }],
        { session }
      );

      await session.commitTransaction();
      logger.info('Admin top-up', { userId, amount, adminId });
      return wallet;
    } catch (error) {
      await session.abortTransaction();
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Top-up failed', 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Raise a dispute on a transaction (student action)
   * Allowed within 48 hours of the transaction.
   */
  async raiseDispute(userId, sessionId, reason) {
    const { Session } = require('../bookings/booking.model');
    const sessionDoc = await Session.findById(sessionId);
    if (!sessionDoc) {
      throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Session not found', 404);
    }

    // Verify user is the student of this session
    if (sessionDoc.student_id.toString() !== userId.toString()) {
      throw new AppError(errorCodes.AUTH_FORBIDDEN, 'Only the student can raise a dispute', 403);
    }

    // Check 48h window
    const hoursSinceCompletion = (Date.now() - new Date(sessionDoc.updated_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 48) {
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Disputes must be raised within 48 hours', 400);
    }

    if (sessionDoc.status === 'disputed') {
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'A dispute already exists for this session', 409);
    }

    sessionDoc.status = 'disputed';
    await sessionDoc.save();

    // Create a dispute transaction record
    const wallet = await Wallet.findOne({ user_id: userId });
    await Transaction.create({
      user_id: userId,
      type: 'dispute',
      amount: sessionDoc.credits_reserved,
      balance_after: wallet ? wallet.balance : 0,
      reference_id: sessionId,
      reference_type: 'dispute',
      description: `Dispute raised: ${reason || 'No reason provided'}`,
    });

    logger.info('Dispute raised', { userId, sessionId, reason });
    return { sessionId, status: 'disputed', reason };
  }

  /**
   * Resolve a dispute (admin action)
   * resolution: 'full_refund' | 'partial_refund' | 'no_refund'
   */
  async resolveDispute(adminId, sessionId, resolution, refundPercent = 100) {
    const { Session } = require('../bookings/booking.model');
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const sessionDoc = await Session.findById(sessionId).session(dbSession);
      if (!sessionDoc || sessionDoc.status !== 'disputed') {
        throw new AppError(errorCodes.SESSION_NOT_FOUND, 'Disputed session not found', 404);
      }

      const { TutorProfile } = require('../tutors/tutor.model');
      const tutorProfile = await TutorProfile.findById(sessionDoc.tutor_id);

      if (resolution === 'full_refund' || resolution === 'partial_refund') {
        const refundAmount = resolution === 'full_refund'
          ? sessionDoc.credits_reserved
          : Math.ceil(sessionDoc.credits_reserved * (refundPercent / 100));

        // Refund to student
        const studentWallet = await Wallet.findOne({ user_id: sessionDoc.student_id }).session(dbSession);
        if (studentWallet) {
          studentWallet.balance += refundAmount;
          await studentWallet.save({ session: dbSession });
        }

        // Deduct from tutor if already paid
        if (sessionDoc.credits_released > 0 && tutorProfile) {
          const tutorWallet = await Wallet.findOne({ user_id: tutorProfile.user_id }).session(dbSession);
          if (tutorWallet) {
            tutorWallet.balance = Math.max(0, tutorWallet.balance - refundAmount);
            await tutorWallet.save({ session: dbSession });
          }
        }

        await Transaction.create(
          [{
            user_id: sessionDoc.student_id,
            type: 'refund',
            amount: refundAmount,
            balance_after: studentWallet ? studentWallet.balance : 0,
            reference_id: sessionId,
            reference_type: 'dispute',
            description: `Dispute resolved: ${resolution} (${refundPercent}%)`,
          }],
          { session: dbSession }
        );
      }

      sessionDoc.status = 'completed'; // Mark resolved
      await sessionDoc.save({ session: dbSession });

      await dbSession.commitTransaction();
      logger.info('Dispute resolved', { adminId, sessionId, resolution, refundPercent });
      return { sessionId, resolution };
    } catch (error) {
      await dbSession.abortTransaction();
      if (error.isOperational) throw error;
      throw new AppError(errorCodes.WALLET_TRANSACTION_FAILED, 'Failed to resolve dispute', 500);
    } finally {
      dbSession.endSession();
    }
  }

  /**
   * Expire credits older than CREDITS_EXPIRY_DAYS
   * Called by cron job daily.
   */
  async expireCredits() {
    const expiryDays = config.business.creditsExpiryDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

    // Find wallets that have balance > 0 and haven't had activity since cutoff
    const inactiveWallets = await Wallet.find({
      balance: { $gt: 0 },
      updated_at: { $lt: cutoffDate },
    });

    let totalExpired = 0;

    for (const wallet of inactiveWallets) {
      // Check if there's been any transaction since cutoff
      const recentTx = await Transaction.findOne({
        user_id: wallet.user_id,
        created_at: { $gte: cutoffDate },
      });

      if (!recentTx) {
        const expiredAmount = wallet.balance;
        wallet.balance = 0;
        wallet.reserved_balance = 0;
        await wallet.save();

        await Transaction.create({
          user_id: wallet.user_id,
          type: 'expiry',
          amount: expiredAmount,
          balance_after: 0,
          reference_type: 'system',
          description: `Credits expired after ${expiryDays} days of inactivity`,
        });

        totalExpired += expiredAmount;
        logger.info('Credits expired', { userId: wallet.user_id, amount: expiredAmount });
      }
    }

    logger.info('Credit expiry job completed', { walletsChecked: inactiveWallets.length, totalExpired });
    return { walletsChecked: inactiveWallets.length, totalExpired };
  }
}

module.exports = new WalletService();
