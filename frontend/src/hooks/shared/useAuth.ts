import { useKeycloak } from "../../services/shared/keycloakProvider";

interface AuthState {
  isAuthenticated: boolean;
  user: {
    sub: string;
    preferred_username?: string;
    name?: string;
    email?: string;
    roles?: string[];
    realm_access?: { roles: string[] };
    organizations?: Record<string, { id: string; categories: string[] }>;
    organisation_name?: string;
    organisation?: string;
  } | null;
  roles: string[];
  login: () => void;
  logout: () => void;
  loading: boolean;
  // Organization-related properties
  primaryOrganization: { name: string; details: { id: string; categories: string[] } } | null;
  userCategories: string[];
}

/**
 * React hook for Keycloak authentication state.
 * Returns: { isAuthenticated, user, roles, login, logout, loading, primaryOrganization, userCategories }
 */
export const useAuth = (): AuthState => {
  const { 
    isAuthenticated, 
    user, 
    roles, 
    loading, 
    login, 
    logout, 
    primaryOrganization, 
    userCategories 
  } = useKeycloak();

  return {
    isAuthenticated,
    user,
    roles,
    login: () => login(),
    logout: () => logout(),
    loading,
    primaryOrganization,
    userCategories,
  };
};