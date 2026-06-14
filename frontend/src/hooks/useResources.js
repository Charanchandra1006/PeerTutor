import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch resource library (across all tutors)
 */
export function useResources({ subject_id, search, page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['resources', { subject_id, search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subject_id) params.set('subject_id', subject_id);
      if (search) params.set('search', search);
      params.set('page', page);
      params.set('limit', limit);
      const res = await api.get(`/tutors/resources?${params}`);
      return res.data || [];
    },
  });
}

/**
 * Fetch recently viewed tutors
 */
export function useRecentlyViewed() {
  return useQuery({
    queryKey: ['recently-viewed'],
    queryFn: async () => {
      const res = await api.get('/users/recently-viewed');
      return res.data || [];
    },
  });
}

/**
 * Fetch saved tutors
 */
export function useSavedTutors() {
  return useQuery({
    queryKey: ['saved-tutors'],
    queryFn: async () => {
      const res = await api.get('/users/saved-tutors');
      return res.data || [];
    },
  });
}
