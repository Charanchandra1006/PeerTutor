import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth Store — Zustand with localStorage persistence.
 * Manages user data, tokens, and auth state.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      /**
       * Set login data
       */
      login: (userData, accessToken, refreshToken) => {
        set({
          user: userData,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      /**
       * Update tokens (after refresh)
       */
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      /**
       * Update user profile data
       */
      updateUser: (updatedFields) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        }));
      },

      /**
       * Logout — clear all auth state
       */
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      /**
       * Computed: check if user is admin
       */
      isAdmin: () => get().user?.role === 'admin',

      /**
       * Computed: check if user is/can be tutor
       */
      isTutor: () => ['tutor', 'both'].includes(get().user?.role),

      /**
       * Computed: check if user is/can be student
       */
      isStudent: () => ['student', 'both'].includes(get().user?.role),
    }),
    {
      name: 'ptm-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
