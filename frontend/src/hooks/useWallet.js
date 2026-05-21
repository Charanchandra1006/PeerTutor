import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

/**
 * Fetch user's wallet balance and info
 */
export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet');
      return res.data;
    },
  });
}

/**
 * Fetch transaction history
 */
export function useTransactions({ page = 1, limit = 20, type } = {}) {
  return useQuery({
    queryKey: ['transactions', { page, limit, type }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (type) params.set('type', type);
      const res = await api.get(`/wallet/transactions?${params}`);
      return res.data;
    },
  });
}
