import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useEscapeRooms() {
  return useQuery({
    queryKey: ['escape-rooms'],
    queryFn: async () => {
      const res = await api.get('/escape-room/rooms');
      return res.data.rooms;
    },
  });
}

export function useEscapeRoom(id) {
  return useQuery({
    queryKey: ['escape-room', id],
    queryFn: async () => {
      const res = await api.get(`/escape-room/rooms/${id}`);
      return res.data.room;
    },
    enabled: !!id,
  });
}

export function useStartEscapeRoom() {
  return useMutation({
    mutationFn: async (roomId) => {
      const res = await api.post(`/escape-room/rooms/${roomId}/start`);
      return res.data.attempt;
    },
  });
}

export function useSubmitPuzzle() {
  return useMutation({
    mutationFn: async ({ attemptId, puzzleId, answer }) => {
      const res = await api.post(`/escape-room/attempts/${attemptId}/submit-puzzle`, {
        puzzle_id: puzzleId,
        answer
      });
      return res.data;
    },
  });
}

export function useEscapeRoomHint() {
  return useMutation({
    mutationFn: async ({ attemptId, puzzleId }) => {
      const res = await api.post(`/escape-room/attempts/${attemptId}/hint`, {
        puzzle_id: puzzleId
      });
      return res.data.hint;
    },
  });
}

export function useMyAttempts() {
  return useQuery({
    queryKey: ['escape-room-attempts'],
    queryFn: async () => {
      const res = await api.get('/escape-room/attempts/my');
      return res.data.attempts;
    },
  });
}
