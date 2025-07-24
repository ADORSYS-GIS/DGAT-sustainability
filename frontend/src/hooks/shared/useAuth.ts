import { useOidc } from "../../services/shared/oidc";

interface AuthState {
  isAuthenticated: boolean;
  user: {
    sub: string;
    preferred_username?: string;
    name?: string;
    email?: string;
    roles?: string[];
    realm_access?: { roles: string[] };
    organisations?: Record<string, unknown>;
    organisation_name?: string;
    organisation?: string;
  } | null;
  roles: string[];
  login: () => void;
  logout: () => void;
  loading: boolean;
}

/**
 * React hook for OIDC authentication state using oidc-spa.
 * Returns: { isAuthenticated, user, roles, login, logout, loading }
 */
export const useAuth = (): AuthState => {
  const oidc = useOidc();

  if (oidc.isUserLoggedIn) {
    const user = oidc.decodedIdToken;
    const roles = user?.roles || user?.realm_access?.roles || [];
    
    return {
      isAuthenticated: true,
      user,
      roles,
      login: () => console.warn("Already logged in"),
      logout: () => oidc.logout({ redirectTo: "home" }),
      loading: false,
    };
  }

  return {
    isAuthenticated: false,
    user: null,
    roles: [],
    login: () => oidc.login({ doesCurrentHrefRequiresAuth: false }),
    logout: () => console.warn("Not logged in"),
    loading: false,
  };
};