import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, AuthResponse } from '@/types';

interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (authData: AuthResponse) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<Profile>) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (authData) =>
        set({
          user: authData.user,
          accessToken: authData.access_token,
          refreshToken: authData.refresh_token,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setHasHydrated: (state) => {
        set({
          hasHydrated: state,
        });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // This runs after hydration completes
        state?.setHasHydrated(true);
      },
    }
  )
);

