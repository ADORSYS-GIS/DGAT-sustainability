import { useAuth as useAuthFromContext } from '../../contexts/AuthContext';

/**
 * React hook for Keycloak authentication state.
 * Returns: { isAuthenticated, user, roles, login, logout, loading }
 */
export const useAuth = () => {
  return useAuthFromContext();
};