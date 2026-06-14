import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useRecentlyViewed } from '../hooks/useResources';
import { cn, getInitials } from '../lib/utils';
import {
  Search, SlidersHorizontal, Star, BookOpen, Clock, Verified,
  ChevronDown, Loader2, MapPin, Sparkles, History, Heart,
} from 'lucide-react';

const sortOptions = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'rate', label: 'Lowest Price' },
  { value: 'sessions', label: 'Most Sessions' },
  { value: 'newest', label: 'Newest' },
];

function TutorCard({ tutor }) {
  return (
    <Link
      to={`/tutors/${tutor._id}`}
      className="card group hover:shadow-lg hover:border-brand-200 transition-all duration-300 flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white font-bold text-lg shadow-md">
          {getInitials(tutor.user_id?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {tutor.user_id?.name}
            </h3>
            {tutor.is_verified_badge && (
              <Verified className="h-4 w-4 text-brand-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500">
            Year {tutor.user_id?.year} • {tutor.user_id?.branch}
          </p>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{tutor.bio}</p>

      {/* Subjects */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(tutor.subjects || []).slice(0, 3).map((sub) => (
          <span key={sub._id} className="badge-blue !text-[10px]">
            {sub.name || sub.code}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold text-gray-900">{tutor.avg_rating?.toFixed(1) || 'N/A'}</span>
          <span className="text-xs text-gray-400">({tutor.total_sessions} sessions)</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-brand-600">
          <span>{tutor.rate_per_hour}</span>
          <span className="text-xs text-gray-400 font-normal">credits/hr</span>
        </div>
      </div>
    </Link>
  );
}

export default function DiscoveryPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    search: '', subject: '', sort: 'rating', page: 1,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  // AI Recommendations
  const { data: aiPicks, isLoading: loadingAI } = useQuery({
    queryKey: ['ai-picks'],
    queryFn: async () => {
      try {
        const res = await api.post('/tutors/match', { top_n: 5 });
        return res.data || [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  // Recently viewed
  const { data: recentlyViewed = [] } = useRecentlyViewed();

  useEffect(() => {
    fetchSubjects();
    fetchTutors();
  }, [filters.sort, filters.subject, filters.page]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/tutors/subjects');
      setSubjects(res.data || []);
    } catch {}
  };

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 12 };
      if (!params.search) delete params.search;
      if (!params.subject) delete params.subject;
      const res = await api.get('/tutors', { params });
      setTutors(res.data || []);
      setMeta(res.meta || {});
    } catch {}
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTutors();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Tutor</h1>
        <p className="text-gray-500 mt-1">Browse expert peer tutors matched to your needs</p>
      </div>

      {/* AI Picks Section */}
      {(aiPicks || []).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Top Picks For You
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {aiPicks.map((tutor) => (
              <div key={tutor._id} className="min-w-[280px] max-w-[300px] relative">
                {tutor.match_score && (
                  <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    {Math.round(tutor.match_score * 100)}% match
                  </div>
                )}
                <TutorCard tutor={tutor} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            Recently Viewed
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {recentlyViewed.map((tutor) => (
              <div key={tutor._id} className="min-w-[280px] max-w-[300px]">
                <TutorCard tutor={tutor} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card !p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="input !pl-10"
              placeholder="Search tutors by name, subject, or keyword..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value, page: 1 })}
            className="input !w-auto"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}
            className="input !w-auto"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : tutors.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No tutors found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{meta.total} tutors found</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => (
              <TutorCard key={tutor._id} tutor={tutor} />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilters({ ...filters, page: p })}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
                    p === filters.page
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
