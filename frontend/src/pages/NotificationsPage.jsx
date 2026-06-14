import { useState } from 'react';
import { useNotifications, useMarkRead, useMarkAllRead } from '../hooks/useNotifications';
import { cn } from '../lib/utils';
import {
  Bell, CheckCheck, Check, BookOpen, Wallet, Star,
  Shield, Award, Clock, Loader2, AlertTriangle,
} from 'lucide-react';

const typeIcons = {
  booking_confirmed: BookOpen,
  session_reminder: Clock,
  review_prompt: Star,
  credit_alert: Wallet,
  admin_broadcast: Shield,
  badge_earned: Award,
  session_started: BookOpen,
  session_completed: CheckCheck,
  credits_received: Wallet,
  credits_reserved: Wallet,
  low_balance: AlertTriangle,
  account_suspended: Shield,
  tutor_verified: Award,
  general: Bell,
};

const typeColors = {
  booking_confirmed: 'text-blue-500 bg-blue-50',
  session_reminder: 'text-amber-500 bg-amber-50',
  credit_alert: 'text-emerald-500 bg-emerald-50',
  admin_broadcast: 'text-purple-500 bg-purple-50',
  badge_earned: 'text-yellow-500 bg-yellow-50',
  low_balance: 'text-red-500 bg-red-50',
  default: 'text-gray-500 bg-gray-50',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({
    page,
    limit: 20,
    unread_only: filter === 'unread',
  });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleMarkRead = (id) => {
    markRead.mutate(id);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your sessions and activity</p>
        </div>
        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const colorClass = typeColors[n.type] || typeColors.default;

            return (
              <div
                key={n._id}
                className={cn(
                  'card !p-4 flex items-start gap-4 transition-all cursor-pointer hover:shadow-md',
                  !n.is_read && 'border-l-4 border-l-brand-500 bg-brand-50/30'
                )}
                onClick={() => !n.is_read && handleMarkRead(n._id)}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0', colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={cn('text-sm font-semibold', !n.is_read ? 'text-gray-900' : 'text-gray-600')}>
                      {n.title}
                    </h4>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>
                {!n.is_read && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
                p === page ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
