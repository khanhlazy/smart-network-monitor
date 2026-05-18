import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/v1/auth/login', { username, password });
      if (response.data.data.mfaRequired) {
        set({ isLoading: false, error: null });
        return { mfaRequired: true, mfaToken: response.data.data.mfaToken };
      }

      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      if (user.language) {
        localStorage.setItem('app_language', user.language);
      }

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Đã xảy ra lỗi.';
      set({ isLoading: false, error: message });
      return { success: false };
    }
  },

  verifyMfaLogin: async (mfaToken, code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/v1/mfa/verify', { mfaToken, code });
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (user.language) {
        localStorage.setItem('app_language', user.language);
      }

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Mã xác thực không hợp lệ.';
      set({ isLoading: false, error: message });
      return { success: false };
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchMe: async () => {
    try {
      const response = await api.get('/api/v1/me', {
        headers: { Authorization: `Bearer ${get().accessToken}` },
      });
      set({ user: response.data.data });
    } catch (error) {
      if (error.response?.status === 401) {
        get().logout();
      }
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
