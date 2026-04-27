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
  organizations?: Record<string, {
    id: string;
    categories: string[];
  }>;
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
  organizationId?: string; // Add organizationId to AuthState
}

/**
 * Initialize Keycloak authentication
 */
export const initializeAuth = async (): Promise<boolean> => {
  const isOnline = navigator.onLine;

  if (!isOnline) {
    return initializeFromStoredTokens();
  }

  // Online mode
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Keycloak initialization timeout")), 10000);
    });

    const initPromise = keycloak.init(keycloakInitOptions);
    const authenticated = await Promise.race([initPromise, timeoutPromise]);

    if (authenticated) {
      await storeTokens();
      console.log("Keycloak initialized successfully (Online).");
    }

    return authenticated;
  } catch (error) {
    console.error("Online Keycloak initialization failed:", error);
    console.log("Attempting to use stored tokens as fallback...");
    return initializeFromStoredTokens();
  }
};

/**
 * Restore auth state from stored tokens without contacting Keycloak server.
 * Used when offline or when online init fails.
 */
const initializeFromStoredTokens = async (): Promise<boolean> => {
  const storedTokens = await getStoredTokens();
  if (!storedTokens?.accessToken) {
    console.log("No stored tokens available.");
    return false;
  }

  try {
    console.log("Restoring auth from stored tokens (no network call).");

    // If Keycloak is already initialized, just inject the tokens directly
    if ((keycloak as any).didInitialize) {
      (keycloak as any).token = storedTokens.accessToken;
      (keycloak as any).refreshToken = storedTokens.refreshToken;
      (keycloak as any).idToken = storedTokens.idToken;
      try {
        const parts = storedTokens.accessToken.split('.');
        if (parts.length === 3) {
          (keycloak as any).tokenParsed = JSON.parse(atob(parts[1]));
        }
      } catch { }
      (keycloak as any).authenticated = true;
      return true;
    }

    // Manually set tokens on the Keycloak instance — this avoids any network call.
    const authenticated = await keycloak.init({
      token: storedTokens.accessToken,
      refreshToken: storedTokens.refreshToken,
      idToken: storedTokens.idToken,
      checkLoginIframe: false,
      // No onLoad — this prevents Keycloak from making any network requests
    });

    if (authenticated) {
      console.log("Auth restored from stored tokens.");
      return true;
    }

    // keycloak.init may return false if the token is expired but we still want
    // to treat the user as authenticated for offline use.
    if (keycloak.tokenParsed) {
      console.log("Token expired but restoring offline session anyway.");
      (keycloak as any).authenticated = true;
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to restore auth from stored tokens:", error);
    // Last resort: parse the token manually and inject into keycloak instance
    try {
      const parts = storedTokens.accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        (keycloak as any).token = storedTokens.accessToken;
        (keycloak as any).refreshToken = storedTokens.refreshToken;
        (keycloak as any).idToken = storedTokens.idToken;
        (keycloak as any).tokenParsed = payload;
        (keycloak as any).authenticated = true;
        console.log("Auth restored via manual token parsing.");
        return true;
      }
    } catch (parseError) {
      console.error("Manual token parsing failed:", parseError);
    }
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

    // Also persist the parsed user profile so it's available offline even if token expires
    const profile = getUserProfile();
    if (profile) {
      await set("auth_user_profile", profile);
    }
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
    await del("auth_user_profile");
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
    // Check if Keycloak is initialized
    if (!keycloak.authenticated && !keycloak.token) {
      // Try to load from storage as a fallback
      const stored = await getStoredTokens();
      if (stored?.accessToken) {
        // Basic check if stored token is expired
        const parts = stored.accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.warn("Stored token is expired.");
            return null;
          }
        }
        return stored.accessToken;
      }
      return null;
    }

    // Check if token needs refresh (refresh 30 seconds before expiry)
    if (keycloak.tokenParsed?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = keycloak.tokenParsed.exp - now;

      // If token is already expired, return null immediately if offline is not allowed
      // or if we are online but refresh failed
      if (timeUntilExpiry <= 30) {
        if (navigator.onLine) {
          try {
            // updateToken(5) ensures we have at least 5 seconds of validity left
            const refreshed = await keycloak.updateToken(30);
            if (refreshed) {
              await storeTokens();
            }
          } catch (refreshError) {
            console.error("Token refresh failed during request:", refreshError);
            // If online and refresh failed, the token is dead
            return null;
          }
        } else {
          // Offline and token is expiring/expired
          // We'll return it anyway as it's our only hope for the local interceptor
          // BUT processQueue should ideally wait for online status.
          if (timeUntilExpiry < 0) {
            console.warn("Using expired token while offline.");
          }
        }
      }
    }

    // Final check for token existence
    if (!keycloak.token) return null;

    // Second safety check: is it actually expired right now?
    if (keycloak.tokenParsed?.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (keycloak.tokenParsed.exp < now && navigator.onLine) {
        console.error("Token is expired and we are online. Returning null to prevent 401.");
        return null;
      }
    }

    return keycloak.token;
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

    let organizationId: string | undefined;
    if (token.organizations) {
      const orgKeys = Object.keys(token.organizations);
      if (orgKeys.length > 0) {
        organizationId = token.organizations[orgKeys[0]].id;
      }
    }

    return {
      sub: token.sub || "",
      preferred_username: token.preferred_username,
      name: token.name,
      email: token.email,
      roles: token.roles || token.realm_access?.roles || [],
      realm_access: token.realm_access,
      organisations: token.organisations,
      organization_name: token.organization_name,
      organization: organizationId,
      organizations: token.organizations,
      categories: token.categories,
    };
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
};

/**
 * Get stored user profile from IndexedDB (used as offline fallback)
 */
export const getStoredUserProfile = async (): Promise<UserProfile | null> => {
  try {
    return await get("auth_user_profile");
  } catch {
    return null;
  }
};

/**
 * Get current authentication state
 */
export const getAuthState = (): AuthState => {
  const isAuthenticated = !!keycloak.authenticated;
  const user = getUserProfile();
  const roles = user?.roles || [];

  return {
    isAuthenticated,
    user,
    roles,
    loading: false,
    organizationId: user?.organization, // Populate organizationId from user profile
  };
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRoles: string[]): boolean => {
  const { roles } = getAuthState();
  const userRoles = roles.map(role => role.toLowerCase());

  return requiredRoles.some(role =>
    userRoles.includes(role.toLowerCase())
  );
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
  // Only setup token refresh if Keycloak is already initialized
  if (!keycloak.authenticated && !keycloak.token) {
    console.log("Keycloak not initialized yet, skipping token refresh setup");
    return;
  }

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
  init?: RequestInit
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