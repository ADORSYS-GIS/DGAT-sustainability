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
    organization_name?: string;
    organization?: string;
    organizations?: Record<string, {
      id: string;
      categories: string[];
    }>;
    categories?: string[]; // Personal categories from ID token for Org_User
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
    
    // Debug: Log the raw decoded ID token
    console.log('useAuth - Raw decoded ID token:', user);
    console.log('useAuth - User organizations:', user?.organizations);
    console.log('useAuth - User categories:', user?.categories);
    console.log('useAuth - All user properties:', Object.keys(user || {}));
    
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