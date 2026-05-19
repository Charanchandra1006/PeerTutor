import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Verified, Calendar, Clock, BookOpen, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { getInitials } from '../lib/utils';

export default function TutorProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('about');

  // Placeholder data (would be fetched via React Query in production)
  const tutor = {
    user_id: { name: 'Arjun Reddy', year: 4, branch: 'CSE', profile_photo_url: '' },
    bio: 'Senior CSE student specializing in data structures and algorithms. 3 years of competitive programming experience. I believe in making complex topics simple and accessible.',
    rate_per_hour: 30,
    avg_rating: 4.8,
    total_sessions: 28,
    total_ratings: 24,
    is_verified_badge: true,
    subjects: [{ name: 'Data Structures', code: 'CS201' }, { name: 'Algorithms', code: 'CS301' }, { name: 'Web Development', code: 'CS202' }],
    availability: [
      { day: 1, start_time: '09:00', end_time: '12:00' },
      { day: 3, start_time: '14:00', end_time: '17:00' },
      { day: 5, start_time: '10:00', end_time: '13:00' },
    ],
    languages: ['English', 'Hindi', 'Telugu'],
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/discover" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Discovery
      </Link>

      {/* Profile Header */}
      <div className="card !p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-400 text-white font-bold text-3xl shadow-lg">
            {getInitials(tutor.user_id.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{tutor.user_id.name}</h1>
              {tutor.is_verified_badge && <Verified className="h-5 w-5 text-brand-500" />}
            </div>
            <p className="text-gray-500 mb-4">Year {tutor.user_id.year} • {tutor.user_id.branch}</p>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{tutor.avg_rating}</span>
                <span className="text-gray-400">({tutor.total_ratings} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <BookOpen className="h-4 w-4" />
                {tutor.total_sessions} sessions
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-brand-600">
                {tutor.rate_per_hour} credits/hr
              </div>
            </div>
          </div>
          <Link
            to={`/bookings?tutor=${id}`}
            className="btn-primary !py-3 !px-8 gap-2 self-start"
          >
            <Calendar className="h-4 w-4" />
            Book Session
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['about', 'reviews', 'resources'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">About</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{tutor.bio}</p>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {tutor.subjects.map((sub) => (
                <span key={sub.code} className="badge-blue">{sub.name}</span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Availability</h3>
            <div className="space-y-2">
              {tutor.availability.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-medium text-gray-700">{days[slot.day]}</span>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-3.5 w-3.5" />
                    {slot.start_time} — {slot.end_time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Languages</h3>
            <div className="flex flex-wrap gap-2">
              {tutor.languages.map((lang) => (
                <span key={lang} className="badge bg-gray-100 text-gray-700">{lang}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="card text-center py-12 text-gray-500">
          <Star className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Reviews will load from the API</p>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="card text-center py-12 text-gray-500">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Resources will load from the API</p>
        </div>
      )}
    </div>
  );
}
