import { create } from 'zustand';

interface AuthState {
  username: string | null;
  status: 'unknown' | 'authenticated' | 'anonymous';
  setAuthenticated: (username: string) => void;
  setAnonymous: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  status: 'unknown',
  setAuthenticated: (username) => set({ username, status: 'authenticated' }),
  setAnonymous: () => set({ username: null, status: 'anonymous' }),
}));
