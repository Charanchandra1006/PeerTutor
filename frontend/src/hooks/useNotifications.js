import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch user notifications (paginated)
 */
export function useNotifications({ page = 1, limit = 20, unread_only = false } = {}) {
  return useQuery({
    queryKey: ['notifications', { page, limit, unread_only }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (unread_only) params.set('unread_only', 'true');
      const res = await api.get(`/notifications?${params}`);
      return res;
    },
  });
}

/**
 * Fetch unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data?.unreadCount || 0;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Mark a notification as read
 */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
