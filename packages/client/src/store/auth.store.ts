import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { id: string; email: string } | null;
  sensitivity: 'conservative' | 'balanced' | 'aggressive';
  setAuth: (token: string, user: { id: string; email: string }) => void;
  setSensitivity: (level: 'conservative' | 'balanced' | 'aggressive') => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  sensitivity: (localStorage.getItem('sensitivity') as any) || 'balanced',
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  setSensitivity: (level) => {
    localStorage.setItem('sensitivity', level);
    set({ sensitivity: level });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,
}));
