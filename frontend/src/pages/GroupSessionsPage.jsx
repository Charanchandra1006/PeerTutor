import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupSessions, useJoinGroupSession } from '../hooks/useGroupSessions';
import { cn, formatCredits, getInitials } from '../lib/utils';
import toast from 'react-hot-toast';
import {
  Users, Search, Calendar, Clock, Coins, Filter, Plus,
  ArrowRight, Star, Loader2, UserCheck, BookOpen, TrendingUp,
} from 'lucide-react';

export default function GroupSessionsPage() {
  const { user } = useAuthStore();
  const isTutor = ['tutor', 'both'].includes(user?.role);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const { data, isLoading } = useGroupSessions({ sort_by: sortBy, subject_id: subjectFilter || undefined });
  const joinMutation = useJoinGroupSession();

  const sessions = data?.data || [];

  const handleJoin = async (sessionId) => {
    try {
      await joinMutation.mutateAsync(sessionId);
      toast.success('Successfully joined the group session!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join session');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Sessions</h1>
          <p className="text-gray-500 mt-1">Join crash courses, revision classes, and collaborative learning</p>
        </div>
        {isTutor && (
          <Link to="/group-sessions/create" className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            Create Session
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            Filters:
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input !w-auto !py-2 text-sm"
          >
            <option value="date">Nearest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="seats">Most Seats</option>
          </select>
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No group sessions available</h3>
          <p className="text-gray-500 mb-4">Check back later or create your own!</p>
          {isTutor && (
            <Link to="/group-sessions/create" className="btn-primary gap-2 inline-flex">
              <Plus className="h-4 w-4" />
              Create Group Session
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const seatsRemaining = session.seats_remaining ?? (session.max_participants - 1 - (session.group_students?.length || 0));
            const totalJoined = session.total_joined ?? (1 + (session.group_students?.length || 0));
            const seatPercent = Math.round((totalJoined / session.max_participants) * 100);
            const tutorName = session.tutor_id?.user_id?.name || 'Tutor';
            const subjectName = session.subject_id?.name || 'Subject';
            const scheduledDate = new Date(session.scheduled_at);

            return (
              <div key={session._id} className="card group hover:shadow-lg hover:border-brand-200 transition-all !p-0 overflow-hidden">
                {/* Header gradient */}
                <div className="bg-gradient-to-r from-brand-600 to-accent-500 p-4 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium bg-white/20 rounded-full px-2 py-0.5">{subjectName}</span>
                      <h3 className="text-lg font-bold mt-2 leading-snug">{session.title || 'Group Session'}</h3>
                    </div>
                    {session.tutor_id?.is_verified_badge && (
                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                  {/* Tutor info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
                      {getInitials(tutorName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tutorName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {session.tutor_id?.avg_rating?.toFixed(1) || 'N/A'}
                        <span className="mx-1">·</span>
                        {session.tutor_id?.total_sessions || 0} sessions
                      </div>
                    </div>
                  </div>

                  {/* Session details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {scheduledDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      {session.duration_minutes} min
                    </div>
                    <div className="flex items-center gap-2 font-medium text-brand-600">
                      <Coins className="h-4 w-4" />
                      {session.credits_per_student} credits
                    </div>
                  </div>

                  {/* Seat progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {totalJoined}/{session.max_participants} joined
                      </span>
                      <span className={cn(
                        'font-medium',
                        seatsRemaining <= 3 ? 'text-red-600' : seatsRemaining <= 10 ? 'text-yellow-600' : 'text-green-600'
                      )}>
                        {seatsRemaining} seats left
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-500',
                          seatPercent >= 90 ? 'bg-red-500' : seatPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(seatPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      to={`/group-sessions/${session._id}`}
                      className="btn-secondary flex-1 !py-2 text-sm justify-center"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleJoin(session._id)}
                      disabled={joinMutation.isPending || seatsRemaining <= 0}
                      className="btn-primary flex-1 !py-2 text-sm gap-1 justify-center"
                    >
                      {joinMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : seatsRemaining <= 0 ? (
                        'Full'
                      ) : (
                        <>Join <ArrowRight className="h-3 w-3" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
