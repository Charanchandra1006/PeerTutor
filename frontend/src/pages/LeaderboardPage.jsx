import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { cn, getInitials } from '../lib/utils';
import { Trophy, Medal, Award, Star, Flame, Crown, Loader2, Users } from 'lucide-react';

const badgeInfo = {
  quick_learner: { label: 'Quick Learner', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  session_streak: { label: 'Session Streak', icon: '🔥', color: 'bg-orange-100 text-orange-700' },
  subject_master: { label: 'Subject Master', icon: '🎯', color: 'bg-blue-100 text-blue-700' },
  top_rated: { label: 'Top Rated', icon: '⭐', color: 'bg-amber-100 text-amber-700' },
  most_booked: { label: 'Most Booked', icon: '📅', color: 'bg-green-100 text-green-700' },
  community_pillar: { label: 'Community Pillar', icon: '🏛️', color: 'bg-purple-100 text-purple-700' },
  first_session: { label: 'First Session', icon: '🎉', color: 'bg-pink-100 text-pink-700' },
  escape_artist: { label: 'Escape Artist', icon: '🔓', color: 'bg-indigo-100 text-indigo-700' },
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState('tutors');

  const { data: topTutors, isLoading: loadingTutors } = useQuery({
    queryKey: ['leaderboard', 'tutors'],
    queryFn: async () => {
      const res = await api.get('/tutors?sort=rating&limit=20');
      return res.data || [];
    },
  });

  const { data: topStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['leaderboard', 'students'],
    queryFn: async () => {
      const res = await api.get('/users/leaderboard?limit=20');
      return res.data || res || [];
    },
    enabled: tab === 'students',
  });

  const loading = tab === 'tutors' ? loadingTutors : loadingStudents;

  const rankIcons = [
    <Crown className="h-6 w-6 text-yellow-500" />,
    <Medal className="h-6 w-6 text-gray-400" />,
    <Medal className="h-6 w-6 text-amber-600" />,
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white mb-4 shadow-lg">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 mt-1">Top performers this week</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2">
        {[
          { id: 'tutors', label: 'Top Tutors', icon: Star },
          { id: 'students', label: 'Top Students', icon: Flame },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'tutors' && (topTutors || []).map((tutor, idx) => (
            <div
              key={tutor._id}
              className={cn(
                'card !p-4 flex items-center gap-4 transition-all hover:shadow-md',
                idx < 3 && 'border-l-4',
                idx === 0 && 'border-l-yellow-400 bg-yellow-50/30',
                idx === 1 && 'border-l-gray-300 bg-gray-50/30',
                idx === 2 && 'border-l-amber-500 bg-amber-50/30'
              )}
            >
              {/* Rank */}
              <div className="flex h-10 w-10 items-center justify-center font-bold text-lg">
                {idx < 3 ? rankIcons[idx] : <span className="text-gray-400">#{idx + 1}</span>}
              </div>

              {/* Avatar */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white font-bold text-lg shadow">
                {getInitials(tutor.user_id?.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{tutor.user_id?.name}</h3>
                <p className="text-xs text-gray-500">
                  {tutor.total_sessions} sessions • {(tutor.subjects || []).map(s => s.name || s.code).join(', ')}
                </p>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-900">{tutor.avg_rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <p className="text-xs text-gray-400">{tutor.total_ratings || 0} reviews</p>
              </div>
            </div>
          ))}

          {tab === 'students' && (topStudents || []).map((student, idx) => (
            <div
              key={student._id}
              className={cn(
                'card !p-4 flex items-center gap-4 transition-all hover:shadow-md',
                idx < 3 && 'border-l-4',
                idx === 0 && 'border-l-yellow-400 bg-yellow-50/30',
                idx === 1 && 'border-l-gray-300',
                idx === 2 && 'border-l-amber-500'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center font-bold text-lg">
                {idx < 3 ? rankIcons[idx] : <span className="text-gray-400">#{idx + 1}</span>}
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-white font-bold text-lg shadow">
                {getInitials(student.name)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(student.badges || []).slice(0, 4).map((b, i) => {
                    const info = badgeInfo[b.type] || { label: b.type, icon: '🏅', color: 'bg-gray-100 text-gray-600' };
                    return (
                      <span key={i} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', info.color)}>
                        {info.icon} {info.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-gray-900">{student.xp_points || 0}</span>
                </div>
                <p className="text-xs text-gray-400">XP Points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
