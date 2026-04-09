import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Convenience hook over useAuthStore.
 * Adds navigation (redirect to / after login, /login after logout).
 */
export function useAuth() {
  const { user, isLoading, error, getUserRole } = useAuthStore();
  const login = useAuthStore((s) => s.login);
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
      navigate('/');
    },
    [login, navigate],
  );

  const handleLogout = useCallback(() => {
    logoutStore();
    navigate('/login');
  }, [logoutStore, navigate]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    role: getUserRole(),
    login: handleLogin,
    logout: handleLogout,
  };
}
