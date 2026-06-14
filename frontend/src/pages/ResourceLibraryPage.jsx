import { useState } from 'react';
import { useResources } from '../hooks/useResources';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { cn, getInitials } from '../lib/utils';
import {
  BookOpen, Search, FileText, Download, Coins,
  Loader2, Filter, ExternalLink,
} from 'lucide-react';

export default function ResourceLibraryPage() {
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [page, setPage] = useState(1);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/tutors/subjects');
      return res.data || [];
    },
  });

  const { data: resources = [], isLoading } = useResources({
    subject_id: subjectId,
    search,
    page,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-brand-500" />
          Resource Library
        </h1>
        <p className="text-gray-500 mt-1">Browse study materials shared by tutors</p>
      </div>

      {/* Search & Filters */}
      <div className="card !p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="input !pl-10"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
            className="input !w-auto"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No resources found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((item, idx) => {
            const resource = item.resources || item;
            const tutor = item.tutor || {};

            return (
              <div key={idx} className="card hover:shadow-lg transition-all duration-300 group">
                {/* Type Icon */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  {resource.credit_cost > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      <Coins className="h-3 w-3" />
                      {resource.credit_cost} credits
                    </span>
                  )}
                  {resource.credit_cost === 0 && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      Free
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-600 transition-colors line-clamp-1">
                  {resource.title}
                </h3>

                {/* Description */}
                {resource.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{resource.description}</p>
                )}

                {/* Tutor Info */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white text-[10px] font-bold">
                    {getInitials(tutor.name)}
                  </div>
                  <span className="text-xs text-gray-500">{tutor.name || 'Unknown tutor'}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {resource.download_count || 0} downloads
                  </span>
                  {resource.file_url && (
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
