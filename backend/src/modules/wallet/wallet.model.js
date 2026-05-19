const mongoose = require('mongoose');

/**
 * Wallet Schema
 * Collection: wallets
 * One wallet per user. Balance can never go negative.
 */
const walletSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Balance cannot go negative'],
    },
    reserved_balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total_earned: {
      type: Number,
      default: 0,
    },
    total_spent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  }
);

/**
 * Available balance = balance - reserved_balance
 */
walletSchema.virtual('available_balance').get(function () {
  return this.balance - this.reserved_balance;
});

walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

const Wallet = mongoose.model('Wallet', walletSchema);

/**
 * Transaction Schema
 * Collection: transactions
 * IMMUTABLE — append-only, never update or delete.
 */
const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'reserve', 'release', 'refund', 'topup', 'platform_fee', 'welcome'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    balance_after: {
      type: Number,
      required: true,
    },
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    reference_type: {
      type: String,
      enum: ['session', 'dispute', 'admin', 'system'],
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    // Prevent updates and deletes at schema level
    strict: true,
  }
);

// Compound index for paginated history
transactionSchema.index({ user_id: 1, created_at: -1 });

// Prevent updates to transactions (immutable)
transactionSchema.pre('findOneAndUpdate', function () {
  throw new Error('Transactions are immutable — cannot update');
});

transactionSchema.pre('updateOne', function () {
  throw new Error('Transactions are immutable — cannot update');
});

transactionSchema.pre('updateMany', function () {
  throw new Error('Transactions are immutable — cannot update');
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Wallet, Transaction };
