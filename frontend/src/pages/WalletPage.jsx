import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Clock, RefreshCw, Gift } from 'lucide-react';
import { cn } from '../lib/utils';

const txnTypeConfig = {
  credit: { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-50', label: 'Earned' },
  debit: { icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50', label: 'Spent' },
  reserve: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Reserved' },
  release: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Released' },
  refund: { icon: RefreshCw, color: 'text-green-600', bg: 'bg-green-50', label: 'Refund' },
  topup: { icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50', label: 'Top-up' },
  welcome: { icon: Gift, color: 'text-accent-600', bg: 'bg-accent-50', label: 'Welcome Bonus' },
  platform_fee: { icon: ArrowUpRight, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Platform Fee' },
};

export default function WalletPage() {
  const [filter, setFilter] = useState('all');

  const wallet = { balance: 150, reserved_balance: 30, available_balance: 120, total_earned: 580, total_spent: 430 };
  const transactions = [
    { _id: '1', type: 'welcome', amount: 50, balance_after: 50, description: 'Welcome bonus: 50 credits', created_at: '2024-03-01' },
    { _id: '2', type: 'reserve', amount: 30, balance_after: 20, description: 'Credits reserved for Data Structures session', created_at: '2024-03-10' },
    { _id: '3', type: 'credit', amount: 60, balance_after: 80, description: 'Session earnings (after 10% fee)', created_at: '2024-03-11' },
    { _id: '4', type: 'debit', amount: 25, balance_after: 55, description: 'Session completed — credits released', created_at: '2024-03-12' },
    { _id: '5', type: 'refund', amount: 30, balance_after: 85, description: 'Booking cancelled — full refund', created_at: '2024-03-13' },
    { _id: '6', type: 'topup', amount: 100, balance_after: 185, description: 'Admin top-up: Academic reward', created_at: '2024-03-14' },
  ];

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>

      {/* Balance Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 !text-white !border-0">
          <Wallet className="h-8 w-8 mb-3 opacity-80" />
          <p className="text-sm text-brand-200">Available Balance</p>
          <p className="text-3xl font-bold mt-1">{wallet.available_balance}</p>
          <p className="text-xs text-brand-200 mt-1">credits</p>
        </div>
        <div className="card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600 mb-3">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-bold text-gray-900">{wallet.total_earned}</p>
        </div>
        <div className="card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">{wallet.total_spent}</p>
        </div>
      </div>

      {/* Reserved Balance Notice */}
      {wallet.reserved_balance > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {wallet.reserved_balance} credits reserved for upcoming sessions
            </p>
            <p className="text-xs text-yellow-600">Reserved credits will be released after session completion or cancellation.</p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input !w-auto !py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="credit">Earned</option>
            <option value="debit">Spent</option>
            <option value="reserve">Reserved</option>
            <option value="refund">Refunds</option>
            <option value="topup">Top-ups</option>
            <option value="welcome">Welcome</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map((txn) => {
            const config = txnTypeConfig[txn.type] || txnTypeConfig.credit;
            const Icon = config.icon;
            const isPositive = ['credit', 'refund', 'release', 'topup', 'welcome'].includes(txn.type);

            return (
              <div key={txn._id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', config.bg)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{txn.description}</p>
                  <p className="text-xs text-gray-400">{new Date(txn.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={cn('font-semibold', isPositive ? 'text-green-600' : 'text-red-600')}>
                    {isPositive ? '+' : '-'}{txn.amount}
                  </p>
                  <p className="text-xs text-gray-400">bal: {txn.balance_after}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
