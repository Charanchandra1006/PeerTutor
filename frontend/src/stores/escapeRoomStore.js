import { create } from 'zustand';

export const useEscapeRoomStore = create((set, get) => ({
  attemptId: null,
  room: null,
  currentPuzzleIndex: 0,
  timeLeft: 0,
  status: 'idle', // idle, in_progress, completed, abandoned
  score: 0,
  hintsUsed: {},

  setGameData: (attemptId, room) => set({
    attemptId,
    room,
    currentPuzzleIndex: 0,
    timeLeft: room.time_limit_seconds,
    status: 'in_progress',
    score: 0,
    hintsUsed: {},
  }),

  tickTimer: () => set((state) => {
    if (state.timeLeft <= 0 || state.status !== 'in_progress') return state;
    if (state.timeLeft === 1) return { timeLeft: 0, status: 'completed' }; // Time's up
    return { timeLeft: state.timeLeft - 1 };
  }),

  nextPuzzle: (scoreGained) => set((state) => ({
    currentPuzzleIndex: state.currentPuzzleIndex + 1,
    score: state.score + scoreGained,
  })),

  completeRoom: (finalScore) => set({
    status: 'completed',
    score: finalScore,
  }),

  abandonRoom: () => set({
    status: 'abandoned',
  }),

  useHint: (puzzleId) => set((state) => ({
    hintsUsed: {
      ...state.hintsUsed,
      [puzzleId]: (state.hintsUsed[puzzleId] || 0) + 1
    }
  })),

  reset: () => set({
    attemptId: null,
    room: null,
    currentPuzzleIndex: 0,
    timeLeft: 0,
    status: 'idle',
    score: 0,
    hintsUsed: {},
  })
}));
