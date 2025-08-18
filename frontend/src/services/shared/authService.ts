import { keycloak, keycloakInitOptions } from "./keycloakConfig";
import { get, set, del } from "idb-keyval";

/**
 * User profile interface
 */
export interface UserProfile {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  roles?: string[];
  realm_access?: { roles: string[] };
  organisations?: Record<string, unknown>;
  organization_name?: string;
  organization?: string;
  organizations?: Record<
    string,
    {
      id: string;
      categories: string[];
    }
  >;
  categories?: string[];
}

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  roles: string[];
  loading: boolean;
}

/**
 * Initialize Keycloak authentication
 */
export const initializeAuth = async (): Promise<boolean> => {
  try {
    const authenticated = await keycloak.init(keycloakInitOptions);

    if (authenticated) {
      // Store tokens in IndexedDB
      await storeTokens();
      console.log("Keycloak initialized successfully");
    }

    return authenticated;
  } catch (error) {
    console.error("Failed to initialize Keycloak:", error);
    return false;
  }
};

/**
 * Store authentication tokens in IndexedDB
 */
const storeTokens = async (): Promise<void> => {
  try {
    const tokens = {
      accessToken: keycloak.token,
      refreshToken: keycloak.refreshToken,
      idToken: keycloak.idToken,
      expiresAt: keycloak.tokenParsed?.exp,
    };

    await set("auth_tokens", tokens);
  } catch (error) {
    console.error("Failed to store tokens:", error);
  }
};

/**
 * Get stored tokens from IndexedDB
 */
const getStoredTokens = async () => {
  try {
    return await get("auth_tokens");
  } catch (error) {
    console.error("Failed to get stored tokens:", error);
    return null;
  }
};

/**
 * Clear stored tokens from IndexedDB
 */
const clearStoredTokens = async (): Promise<void> => {
  try {
    await del("auth_tokens");
  } catch (error) {
    console.error("Failed to clear stored tokens:", error);
  }
};

/**
 * Login user
 */
export const login = async (redirectUri?: string): Promise<void> => {
  try {
    await keycloak.login({
      redirectUri: redirectUri || window.location.origin,
    });
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async (redirectUri?: string): Promise<void> => {
  try {
    await clearStoredTokens();
    await keycloak.logout({
      redirectUri: redirectUri || window.location.origin,
    });
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

/**
 * Get current access token, refreshing if necessary
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    // Check if token needs refresh (refresh 30 seconds before expiry)
    if (keycloak.tokenParsed?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = keycloak.tokenParsed.exp - now;

      if (timeUntilExpiry <= 30) {
        await keycloak.updateToken(30);
        await storeTokens();
      }
    }

    return keycloak.token || null;
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
};

/**
 * Get user profile from token
 */
export const getUserProfile = (): UserProfile | null => {
  try {
    if (!keycloak.tokenParsed) return null;

    const token = keycloak.tokenParsed;

    return {
      sub: token.sub || "",
      preferred_username: token.preferred_username,
      name: token.name,
      email: token.email,
      roles: token.realm_access?.roles || [],
      realm_access: token.realm_access,
      organisations: token.organisations,
      organization_name: token.organization_name,
      organization: token.organization,
      organizations: token.organizations,
      categories: token.categories,
    };
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
};

/**
 * Get current authentication state
 */
export const getAuthState = (): AuthState => {
  try {
    // Check if Keycloak is available and initialized
    if (!keycloak || keycloak.authenticated === undefined) {
      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        loading: false, // Don't keep loading if Keycloak is not available
      };
    }

    const isAuthenticated = !!keycloak.authenticated;
    const user = getUserProfile();
    const roles = user?.roles || user?.realm_access?.roles || [];

    return {
      isAuthenticated,
      user,
      roles,
      loading: false,
    };
  } catch (error) {
    console.error("Error getting auth state:", error);
    return {
      isAuthenticated: false,
      user: null,
      roles: [],
      loading: false,
    };
  }
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRoles: string[]): boolean => {
  const { roles } = getAuthState();
  const userRoles = roles.map((role) => role.toLowerCase());

  return requiredRoles.some((role) => userRoles.includes(role.toLowerCase()));
};

/**
 * Handle token refresh
 */
export const refreshToken = async (): Promise<boolean> => {
  try {
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      await storeTokens();
    }
    return refreshed;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
};

/**
 * Setup token refresh interval
 */
export const setupTokenRefresh = (): void => {
  // Refresh token every 4 minutes (240 seconds)
  setInterval(async () => {
    if (keycloak.authenticated) {
      await refreshToken();
    }
  }, 240000);
};

/**
 * Create authenticated fetch function
 */
export const fetchWithAuth = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const token = await getAccessToken();

  if (token) {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(input, {
      ...init,
      headers,
    });
  }

  return fetch(input, init);
};
