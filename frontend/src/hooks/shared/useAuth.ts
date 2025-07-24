import { useState, useEffect } from 'react';
import { 
  getUserProfile, 
  isAuthenticated, 
  getUserRoles,
  getStoredUserData,
  login,
  logout,
  type UserProfile 
} from '../../services/shared/authService';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  roles: string[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

/**
 * React hook for Keycloak authentication state using keycloak-js.
 * Returns: { isAuthenticated, user, roles, login, logout, loading }
 */
export const useAuth = (): AuthState => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const authStatus = isAuthenticated();
        setAuthenticated(authStatus);
        
        if (authStatus) {
          // Get user profile
          const profile = await getUserProfile();
          setUser(profile);
        } else {
          // Try to get stored user data for offline access
          const storedUser = await getStoredUserData();
          if (storedUser) {
            setUser(storedUser);
            setAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (): Promise<void> => {
    try {
      setLoading(true);
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      setLoading(true);
      await logout();
      setAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const roles = user?.roles || [];

  return {
    isAuthenticated: authenticated,
    user,
    roles,
    login: handleLogin,
    logout: handleLogout,
    loading,
  };
};