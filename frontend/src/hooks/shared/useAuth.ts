import { useOidc } from "../../services/shared/oidc";
import React from "react";

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
  const decodedToken = oidc.decodedIdToken;

  const user = React.useMemo(() => {
    if (!decodedToken) return null;

    // Extract user information from the decoded token
    const userInfo = {
      sub: decodedToken.sub,
      email: decodedToken.email,
      name: decodedToken.name,
      preferred_username: decodedToken.preferred_username,
      organizations: decodedToken.organizations,
      categories: decodedToken.categories,
      roles: decodedToken.realm_access?.roles || [],
      realm_access: decodedToken.realm_access,
    };

    return userInfo;
  }, [decodedToken]);

  if (oidc.isUserLoggedIn) {
    
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