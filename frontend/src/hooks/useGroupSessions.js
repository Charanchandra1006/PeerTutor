import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Discover available group sessions
 */
export function useGroupSessions({ subject_id, from_date, to_date, sort_by, page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['group-sessions', { subject_id, from_date, to_date, sort_by, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (subject_id) params.set('subject_id', subject_id);
      if (from_date) params.set('from_date', from_date);
      if (to_date) params.set('to_date', to_date);
      if (sort_by) params.set('sort_by', sort_by);
      return api.get(`/group-sessions?${params}`);
    },
  });
}

/**
 * Fetch single group session details
 */
export function useGroupSession(id) {
  return useQuery({
    queryKey: ['group-session', id],
    queryFn: () => api.get(`/group-sessions/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a group session (tutor)
 */
export function useCreateGroupSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/group-sessions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions'] });
    },
  });
}

/**
 * Join a group session
 */
export function useJoinGroupSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/group-sessions/${id}/join`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['group-session', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Leave a group session
 */
export function useLeaveGroupSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/group-sessions/${id}/leave`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['group-session', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Get participants for a group session
 */
export function useGroupSessionParticipants(id) {
  return useQuery({
    queryKey: ['group-session', id, 'participants'],
    queryFn: () => api.get(`/group-sessions/${id}/participants`),
    enabled: !!id,
  });
}
