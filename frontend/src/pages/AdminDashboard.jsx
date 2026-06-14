import { useState } from 'react';
import {
  useAdminStats, useSystemHealth, useModerationQueue,
  useModerateReview, useBroadcast, useExportCSV,
} from '../hooks/useAdmin';
import { cn } from '../lib/utils';
import {
  Users, BookOpen, CalendarDays, Wallet, TrendingUp, AlertTriangle,
  Shield, Activity, Megaphone, FileText, Download, CheckCircle,
  XCircle, Send, Loader2, Server, Database, Cpu, Clock,
} from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'moderation', label: 'Moderation', icon: FileText },
  { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Platform overview and management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0',
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'health' && <HealthTab />}
      {activeTab === 'moderation' && <ModerationTab />}
      {activeTab === 'broadcast' && <BroadcastTab />}
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useAdminStats();
  const exportCSV = useExportCSV();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Tutors', value: stats?.totalTutors || 0, icon: BookOpen, color: 'bg-green-50 text-green-600' },
    { label: 'Total Sessions', value: stats?.totalSessions || 0, icon: CalendarDays, color: 'bg-purple-50 text-purple-600' },
    { label: 'Today\'s Sessions', value: stats?.todaySessions || 0, icon: Clock, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Revenue', value: `${stats?.totalRevenue || 0} credits`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Sessions', value: stats?.pendingSessions || 0, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="card !p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Export Transactions</h3>
          <p className="text-sm text-gray-500">Download all transactions as CSV</p>
        </div>
        <button
          onClick={() => exportCSV.mutate()}
          disabled={exportCSV.isPending}
          className="btn-secondary flex items-center gap-2"
        >
          {exportCSV.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </button>
      </div>
    </div>
  );
}

function HealthTab() {
  const { data: health, isLoading } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const serviceColors = {
    connected: 'text-emerald-600 bg-emerald-50',
    healthy: 'text-emerald-600 bg-emerald-50',
    disconnected: 'text-red-600 bg-red-50',
    error: 'text-red-600 bg-red-50',
    unreachable: 'text-red-600 bg-red-50',
    degraded: 'text-amber-600 bg-amber-50',
    unknown: 'text-gray-500 bg-gray-50',
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={cn(
        'card !p-4 flex items-center gap-3',
        health?.status === 'healthy'
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      )}>
        <Activity className={cn(
          'h-6 w-6',
          health?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'
        )} />
        <div>
          <p className="font-semibold text-gray-900">
            System Status: {health?.status === 'healthy' ? '✅ All Systems Operational' : '⚠️ Degraded Performance'}
          </p>
          <p className="text-sm text-gray-500">Uptime: {Math.floor((health?.uptime || 0) / 3600)}h {Math.floor(((health?.uptime || 0) % 3600) / 60)}m</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { name: 'Database', icon: Database, status: health?.services?.database },
          { name: 'Redis Cache', icon: Server, status: health?.services?.redis },
          { name: 'AI Engine', icon: Cpu, status: health?.services?.aiEngine },
        ].map((svc) => (
          <div key={svc.name} className="card text-center">
            <svc.icon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold text-gray-900">{svc.name}</p>
            <span className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold capitalize',
              serviceColors[svc.status] || serviceColors.unknown
            )}>
              {svc.status || 'unknown'}
            </span>
          </div>
        ))}
      </div>

      {/* Memory Usage */}
      {health?.memory && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Memory Usage</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
                  style={{ width: `${Math.min((health.memory.used / health.memory.total) * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {health.memory.used}MB / {health.memory.total}MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ModerationTab() {
  const { data, isLoading } = useModerationQueue();
  const moderateReview = useModerateReview();

  const reviews = data?.data || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Review Moderation Queue</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium">No reviews pending moderation</p>
        </div>
      ) : (
        reviews.map((review) => (
          <div key={review._id} className="card !p-4 flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{review.reviewer_id?.name || 'Unknown'}</span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm text-gray-600">{review.reviewee_id?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={cn('text-lg', i < review.rating ? 'text-yellow-400' : 'text-gray-200')}>★</span>
                ))}
              </div>
              {review.comment && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">"{review.comment}"</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => moderateReview.mutate({ reviewId: review._id, is_approved: true })}
                disabled={moderateReview.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-sm font-medium transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => moderateReview.mutate({ reviewId: review._id, is_approved: false, mod_note: 'Rejected by admin' })}
                disabled={moderateReview.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BroadcastTab() {
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const broadcast = useBroadcast();

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    broadcast.mutate(
      { audience, title, message },
      {
        onSuccess: () => {
          setTitle('');
          setMessage('');
        },
      }
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-brand-500" />
        Send Announcement
      </h2>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="input"
          >
            <option value="all">All Users</option>
            <option value="students">Students Only</option>
            <option value="tutors">Tutors Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            className="input"
            placeholder="Announcement title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="Write your announcement..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!title.trim() || !message.trim() || broadcast.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {broadcast.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Broadcast
        </button>

        {broadcast.isSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg text-sm">
            <CheckCircle className="h-4 w-4" />
            Broadcast sent to {broadcast.data?.data?.recipientCount || 0} users!
          </div>
        )}
      </div>
    </div>
  );
}
