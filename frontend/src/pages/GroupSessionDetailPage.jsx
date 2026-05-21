import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGroupSession, useJoinGroupSession, useLeaveGroupSession, useGroupSessionParticipants } from '../hooks/useGroupSessions';
import { useAuthStore } from '../stores/authStore';
import { cn, getInitials, formatCredits } from '../lib/utils';
import toast from 'react-hot-toast';
import {
  Users, Calendar, Clock, Coins, Video, Star, BookOpen,
  ArrowLeft, Loader2, UserCheck, UserMinus, Download,
  FileText, ChevronRight,
} from 'lucide-react';

export default function GroupSessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: sessionRes, isLoading } = useGroupSession(id);
  const { data: participantsRes } = useGroupSessionParticipants(id);
  const joinMutation = useJoinGroupSession();
  const leaveMutation = useLeaveGroupSession();

  const session = sessionRes?.data || sessionRes;
  const participants = participantsRes?.data?.participants || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card text-center py-16">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Session not found</h2>
        <Link to="/group-sessions" className="btn-primary mt-4 inline-flex">Back to Group Sessions</Link>
      </div>
    );
  }

  const scheduledDate = new Date(session.scheduled_at);
  const tutorName = session.tutor_id?.user_id?.name || 'Tutor';
  const tutorPhoto = session.tutor_id?.user_id?.profile_photo_url;
  const subjectName = session.subject_id?.name || 'Subject';
  const seatsRemaining = session.seats_remaining ?? (session.max_participants - 1 - (session.group_students?.length || 0));
  const totalJoined = session.total_joined ?? (1 + (session.group_students?.length || 0));
  const seatPercent = Math.round((totalJoined / session.max_participants) * 100);

  const isParticipant = session.group_students?.some(s => (s._id || s).toString() === user?._id);
  const isTutor = session.tutor_id?.user_id?._id === user?._id || session.student_id?._id === user?._id;
  const isUpcoming = scheduledDate > new Date();
  const isCompleted = session.status === 'completed';

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync(id);
      toast.success('Successfully joined! Credits reserved.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync(id);
      toast.success('Left the session. Credits refunded.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero Header */}
      <div className="card !p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 p-6 sm:p-8 text-white">
          <span className="text-xs font-medium bg-white/20 rounded-full px-3 py-1">{subjectName}</span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-3">{session.title || 'Group Session'}</h1>
          <p className="text-brand-100 mt-2 text-sm sm:text-base max-w-2xl">{session.description}</p>

          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 opacity-80" />
              {scheduledDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 opacity-80" />
              {scheduledDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {session.duration_minutes} min
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 opacity-80" />
              {session.credits_per_student} credits per student
            </div>
          </div>
        </div>

        {/* Tutor + Seats + Action */}
        <div className="p-6 sm:p-8 grid sm:grid-cols-3 gap-6">
          {/* Tutor */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-lg font-bold flex-shrink-0">
              {tutorPhoto ? (
                <img src={tutorPhoto} alt={tutorName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                getInitials(tutorName)
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tutorName}</p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                {session.tutor_id?.avg_rating?.toFixed(1) || 'N/A'}
                <span className="mx-1">·</span>
                {session.tutor_id?.total_sessions || 0} sessions
              </div>
              {session.tutor_id?.is_verified_badge && (
                <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                  <UserCheck className="h-3 w-3" /> Verified Tutor
                </span>
              )}
            </div>
          </div>

          {/* Seats */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Seats</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={cn(
                      'h-3 rounded-full transition-all',
                      seatPercent >= 90 ? 'bg-red-500' : seatPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(seatPercent, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {totalJoined}/{session.max_participants}
              </span>
            </div>
            <p className={cn(
              'text-xs mt-1 font-medium',
              seatsRemaining <= 3 ? 'text-red-600' : seatsRemaining <= 10 ? 'text-yellow-600' : 'text-green-600'
            )}>
              {seatsRemaining} seats remaining
            </p>
          </div>

          {/* Action */}
          <div className="flex flex-col items-end justify-center">
            {isTutor ? (
              <Link to={`/session/${id}`} className="btn-primary gap-2">
                <Video className="h-4 w-4" /> Open Session Room
              </Link>
            ) : isParticipant && isUpcoming ? (
              <div className="space-y-2 text-right">
                <Link to={`/session/${id}`} className="btn-primary gap-2 w-full justify-center">
                  <Video className="h-4 w-4" /> Join Session
                </Link>
                <button onClick={handleLeave} disabled={leaveMutation.isPending} className="btn-danger !py-1.5 text-xs gap-1 w-full justify-center">
                  {leaveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                  Leave & Refund
                </button>
              </div>
            ) : isCompleted ? (
              <span className="badge badge-green text-sm">Completed</span>
            ) : seatsRemaining <= 0 ? (
              <span className="badge badge-red text-sm">Full</span>
            ) : (
              <button onClick={handleJoin} disabled={joinMutation.isPending} className="btn-primary gap-2">
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Join ({session.credits_per_student} credits)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-500" />
          Participants ({participants.length})
        </h2>
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500">No participants yet. Be the first to join!</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {participants.map((p) => (
              <div key={p._id} className="flex items-center gap-2 rounded-full bg-gray-50 border border-gray-100 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                  {p.profile_photo_url ? (
                    <img src={p.profile_photo_url} alt={p.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    getInitials(p.name)
                  )}
                </div>
                <span className="text-sm text-gray-700">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post-session materials */}
      {isCompleted && session.post_session_materials?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-500" />
            Study Materials
          </h2>
          <div className="space-y-2">
            {session.post_session_materials.map((mat, i) => (
              <a
                key={i}
                href={mat.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-medium text-gray-900">{mat.title}</span>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
