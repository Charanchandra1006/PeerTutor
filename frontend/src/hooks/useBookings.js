import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch user's bookings (both as student and tutor)
 */
export function useBookings({ status, page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['bookings', { status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', page);
      params.set('limit', limit);
      const res = await api.get(`/bookings?${params}`);
      return res.data;
    },
  });
}

/**
 * Fetch a single booking by ID
 */
export function useBooking(id) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/bookings/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Complete a session (tutor action)
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Get upcoming session count
 */
export function useUpcomingSessionCount() {
  return useQuery({
    queryKey: ['bookings', 'upcoming-count'],
    queryFn: async () => {
      const res = await api.get('/bookings?status=confirmed&limit=1');
      return res.meta?.total || 0;
    },
  });
}
