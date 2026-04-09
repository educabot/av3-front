import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import * as apiClient from '@/services/api-client';

// Mock the api module
vi.mock('@/services/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

// Mock api-client token functions (already called at module level)
vi.mock('@/services/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof apiClient>();
  return {
    ...original,
    setAuthToken: vi.fn(),
    setOnUnauthorized: vi.fn(),
  };
});

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({ user: null, isLoading: false, error: null });
    vi.clearAllMocks();
  });

  it('starts with no user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('login', () => {
    it('sets user on successful login', async () => {
      const { authApi } = await import('@/services/api');
      const mockUser = { id: 1, name: 'Test', email: 'test@test.com', avatar: '', roles: ['teacher' as const] };
      vi.mocked(authApi.login).mockResolvedValueOnce({ token: 'jwt-123', user: mockUser });

      await useAuthStore.getState().login('test@test.com', 'pass123');

      expect(apiClient.setAuthToken).toHaveBeenCalledWith('jwt-123');
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on failed login', async () => {
      const { authApi } = await import('@/services/api');
      vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Credenciales invalidas'));

      // In dev mode, mock fallback kicks in — email not in MOCK_USERS so error is set
      await useAuthStore.getState().login('bad@test.com', 'wrong');

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().error).toBe('Error al iniciar sesion. Verifica tus credenciales.');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and token', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@test.com', avatar: '', roles: ['teacher'] },
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(apiClient.setAuthToken).toHaveBeenCalledWith(null);
    });
  });

  describe('getUserRole', () => {
    it('returns null when no user', () => {
      expect(useAuthStore.getState().getUserRole()).toBeNull();
    });

    it('returns coordinator role', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Coord', email: 'c@t.com', avatar: '', roles: ['coordinator'] },
      });
      expect(useAuthStore.getState().getUserRole()).toBe('coordinator');
    });

    it('returns teacher role', () => {
      useAuthStore.setState({
        user: { id: 2, name: 'Teacher', email: 't@t.com', avatar: '', roles: ['teacher'] },
      });
      expect(useAuthStore.getState().getUserRole()).toBe('teacher');
    });

    it('prioritizes coordinator over teacher', () => {
      useAuthStore.setState({
        user: { id: 3, name: 'Multi', email: 'm@t.com', avatar: '', roles: ['teacher', 'coordinator'] },
      });
      expect(useAuthStore.getState().getUserRole()).toBe('coordinator');
    });
  });

  describe('hasRole', () => {
    it('returns false when no user', () => {
      expect(useAuthStore.getState().hasRole('teacher')).toBe(false);
    });

    it('returns true when user has the role', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'T', email: 't@t.com', avatar: '', roles: ['teacher'] },
      });
      expect(useAuthStore.getState().hasRole('teacher')).toBe(true);
    });

    it('returns false when user lacks the role', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'T', email: 't@t.com', avatar: '', roles: ['teacher'] },
      });
      expect(useAuthStore.getState().hasRole('coordinator')).toBe(false);
    });

    it('supports multi-role check', () => {
      useAuthStore.setState({
        user: { id: 3, name: 'Multi', email: 'm@t.com', avatar: '', roles: ['teacher', 'coordinator'] },
      });
      expect(useAuthStore.getState().hasRole('teacher')).toBe(true);
      expect(useAuthStore.getState().hasRole('coordinator')).toBe(true);
      expect(useAuthStore.getState().hasRole('admin')).toBe(false);
      expect(useAuthStore.getState().hasRole('teacher', 'admin')).toBe(true);
    });
  });
});
