import { useEffect, useState } from 'react';
import { oidcPromise } from '../../services/shared/oidc';

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  user: any | null;
  login: () => void;
  logout: () => void;
};

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [oidc, setOidc] = useState<any | null>(null);

  useEffect(() => {
    const initializeOidc = async () => {
      try {
        console.log('[useAuth] Initializing OIDC...');
        const oidcInstance = await oidcPromise;
        setOidc(oidcInstance);

        const isLoggedIn = await oidcInstance.isLoggedIn();
        setIsAuthenticated(isLoggedIn);

        if (isLoggedIn) {
          const userData = await oidcInstance.getUserInfo();
          setUser(userData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[useAuth] OIDC initialization failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    initializeOidc();
  }, []);

  const login = async () => {
    if (!oidc) return;
    try {
      await oidc.login();
    } catch (err) {
      console.error('[useAuth] Login failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const logout = async () => {
    if (!oidc) return;
    try {
      await oidc.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      console.error('[useAuth] Logout failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    user,
    login,
    logout,
  };
}