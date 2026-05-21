import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch tutors for discovery page (paginated, filterable)
 */
export function useTutors({ page = 1, limit = 20, subject, search, sort } = {}) {
  return useQuery({
    queryKey: ['tutors', { page, limit, subject, search, sort }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (subject) params.set('subject', subject);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      const res = await api.get(`/tutors?${params}`);
      return res;
    },
  });
}

/**
 * Fetch a single tutor profile by ID
 */
export function useTutor(id) {
  return useQuery({
    queryKey: ['tutor', id],
    queryFn: async () => {
      const res = await api.get(`/tutors/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch the logged in user's tutor profile
 */
export function useMyTutorProfile() {
  return useQuery({
    queryKey: ['tutor', 'me'],
    queryFn: async () => {
      const res = await api.get('/tutors/profile/me');
      return res.data;
    },
  });
}

/**
 * Fetch AI-recommended tutors for a subject
 */
export function useRecommendedTutors(subject) {
  return useQuery({
    queryKey: ['tutors', 'recommended', subject],
    queryFn: async () => {
      const res = await api.post('/tutors/match', { subject });
      return res.data;
    },
    enabled: !!subject,
  });
}
