import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch system health status
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const res = await api.get('/admin/health');
      return res.data;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fetch review moderation queue
 */
export function useModerationQueue({ page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['admin', 'moderation', { page, limit }],
    queryFn: async () => {
      const res = await api.get(`/admin/reviews/moderation?page=${page}&limit=${limit}`);
      return res;
    },
  });
}

/**
 * Moderate a review (approve/reject)
 */
export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, is_approved, mod_note }) =>
      api.patch(`/admin/reviews/${reviewId}/moderate`, { is_approved, mod_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
    },
  });
}

/**
 * Send broadcast announcement
 */
export function useBroadcast() {
  return useMutation({
    mutationFn: ({ audience, title, message }) =>
      api.post('/admin/broadcast', { audience, title, message }),
  });
}

/**
 * Export transactions as CSV
 */
export function useExportCSV() {
  return useMutation({
    mutationFn: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await api.get(`/admin/export/transactions?${query}`, {
        responseType: 'blob',
        headers: { Accept: 'text/csv' },
      });
      // Trigger download
      const blob = new Blob([res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Fetch admin stats
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
  });
}

/**
 * Fetch disputes (sessions with status 'disputed')
 */
export function useDisputes({ page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: ['admin', 'disputes', { page, limit }],
    queryFn: async () => {
      const res = await api.get(`/admin/sessions?status=disputed&page=${page}&limit=${limit}`);
      return res;
    },
  });
}
