import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { cn } from '../lib/utils';
import {
  TrendingUp, DollarSign, Star, BookOpen, Users,
  Calendar, BarChart3, Loader2, Award, Clock,
} from 'lucide-react';

export default function TutorAnalyticsPage() {
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['tutor', 'my-profile'],
    queryFn: async () => {
      const res = await api.get('/tutors/profile/me');
      return res.data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ['tutor', 'my-bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings?limit=100');
      return res.data || [];
    },
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet');
      return res.data;
    },
  });

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // Calculate analytics
  const sessions = bookings || [];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const cancelledSessions = sessions.filter(s => s.status === 'cancelled');
  const completionRate = sessions.length > 0
    ? Math.round((completedSessions.length / sessions.length) * 100)
    : 0;

  // Subject breakdown
  const subjectCounts = {};
  completedSessions.forEach(s => {
    const subName = s.subject_id?.name || 'Unknown';
    subjectCounts[subName] = (subjectCounts[subName] || 0) + 1;
  });
  const subjectBreakdown = Object.entries(subjectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Monthly earnings (simulated from completed sessions)
  const monthlyData = {};
  completedSessions.forEach(s => {
    const month = new Date(s.scheduled_at).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyData[month] = (monthlyData[month] || 0) + (s.credits_released || s.credits_reserved || 0);
  });

  const stats = [
    {
      label: 'Total Sessions',
      value: profile?.total_sessions || completedSessions.length,
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Average Rating',
      value: profile?.avg_rating?.toFixed(1) || 'N/A',
      icon: Star,
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      label: 'Total Earned',
      value: walletData?.total_earned || 0,
      suffix: ' credits',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const maxSubjectCount = subjectBreakdown.length > 0 ? subjectBreakdown[0][1] : 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-brand-500" />
          Tutor Analytics
        </h1>
        <p className="text-gray-500 mt-1">Track your performance and earnings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card !p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}{stat.suffix || ''}
                </p>
              </div>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bgColor)}>
                <stat.icon className={cn('h-5 w-5', stat.textColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-500" />
            Sessions by Subject
          </h3>
          {subjectBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No session data yet</p>
          ) : (
            <div className="space-y-3">
              {subjectBreakdown.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                    <span className="text-sm text-gray-500">{count} sessions</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxSubjectCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Earnings Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Monthly Earnings
          </h3>
          {Object.keys(monthlyData).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No earnings data yet</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {Object.entries(monthlyData).slice(-6).map(([month, credits]) => {
                const maxCredits = Math.max(...Object.values(monthlyData));
                const height = maxCredits > 0 ? (credits / maxCredits) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-700 mb-1">{credits}</span>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md transition-all duration-500 min-h-[4px]"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-[10px] text-gray-500 mt-1">{month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Profile Completeness */}
      {profile && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-brand-500" />
            Profile Completeness
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-700"
                  style={{ width: `${profile.completeness || 0}%` }}
                />
              </div>
            </div>
            <span className="text-lg font-bold text-brand-600">{profile.completeness || 0}%</span>
          </div>
          {(profile.completeness || 0) < 100 && (
            <p className="text-xs text-gray-500 mt-2">
              Complete your bio, subjects, availability, languages, portfolio, and Calendly link to reach 100%.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
