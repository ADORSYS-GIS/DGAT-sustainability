import { keycloak, keycloakInitOptions } from './keycloakConfig';
import { get, set, del } from 'idb-keyval';

// Storage keys
const AUTH_USER_KEY = 'auth_user';
const TOKENS_KEY = 'auth_tokens';

// Global initialization flag
let isInitialized = false;

// Callback for when Keycloak is initialized
let onInitializedCallback: (() => void) | null = null;

// User profile interface
export interface UserProfile {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  roles?: string[];
  realm_access?: { roles: string[] };
  organizations?: Record<string, unknown>;
  organisation_name?: string;
  organisation?: string;
}

// Token interface
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

// Extended Keycloak token interface
interface KeycloakTokenParsed {
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  roles?: string[];
  realm_access?: { roles: string[] };
  organizations?: Record<string, unknown>;
  organisation_name?: string;
  organisation?: string;
}

// Extended Keycloak user info interface
interface KeycloakUserInfo {
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
}

/**
 * Set callback for when Keycloak is initialized
 */
export const setOnInitializedCallback = (callback: () => void) => {
  onInitializedCallback = callback;
};

/**
 * Initialize Keycloak authentication
 */
export const initializeAuth = async (): Promise<boolean> => {
  try {
    // Check if already initialized
    if (isInitialized || keycloak.authenticated) {
      if (onInitializedCallback) {
        onInitializedCallback();
      }
      return keycloak.authenticated || false;
    }

    const authenticated = await keycloak.init(keycloakInitOptions);
    isInitialized = true;
    
    if (authenticated) {
      // Store user profile and tokens
      await storeUserData();
    }
    
    // Call the callback when initialization is complete (whether authenticated or not)
    if (onInitializedCallback) {
      onInitializedCallback();
    }
    
    return authenticated;
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
    isInitialized = true;
    // Still call the callback even if initialization fails
    if (onInitializedCallback) {
      onInitializedCallback();
    }
    return false;
  }
};

/**
 * Login user
 */
export const login = async (): Promise<void> => {
  try {
    await keycloak.login({
      redirectUri: window.location.origin + '/',
    });
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    // Clear stored data
    await del(AUTH_USER_KEY);
    await del(TOKENS_KEY);
    
    // Logout from Keycloak
    await keycloak.logout({
      redirectUri: window.location.origin + '/',
    });
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

/**
 * Get current access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    // Check if Keycloak is initialized
    if (!keycloak) {
      console.log('Keycloak not initialized');
      return null;
    }

    // If not authenticated, return null without error
    if (!keycloak.authenticated) {
      return null;
    }

    // Try to refresh token if needed
    const refreshed = await keycloak.updateToken(30);
    
    if (refreshed) {
      // Update stored tokens
      await storeUserData();
    }
    
    return keycloak.token || null;
  } catch (error) {
    console.error('Failed to get access token:', error);
    // Don't automatically logout - let the calling code handle authentication failure
    return null;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    if (!keycloak.authenticated) {
      return null;
    }
    
    // Get user info from Keycloak
    const userInfo = await keycloak.loadUserInfo() as KeycloakUserInfo;
    
    // Get roles from token - roles are directly in the token, not in realm_access
    const tokenParsed = keycloak.tokenParsed as KeycloakTokenParsed;
    const roles = tokenParsed?.roles || [];
    
    const profile: UserProfile = {
      sub: userInfo.sub || '',
      preferred_username: userInfo.preferred_username,
      name: userInfo.name,
      email: userInfo.email,
      roles,
      realm_access: tokenParsed?.realm_access,
      organizations: tokenParsed?.organizations,
      organisation_name: tokenParsed?.organisation_name,
      organisation: tokenParsed?.organisation,
    };
    
    return profile;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return keycloak && keycloak.authenticated || false;
};

/**
 * Get user roles
 */
export const getUserRoles = (): string[] => {
  if (!keycloak || !keycloak.authenticated || !keycloak.tokenParsed) {
    return [];
  }
  
  const tokenParsed = keycloak.tokenParsed as KeycloakTokenParsed;
  return tokenParsed?.roles || [];
};

/**
 * Store user data in IndexedDB
 */
const storeUserData = async (): Promise<void> => {
  try {
    const profile = await getUserProfile();
    if (profile) {
      await set(AUTH_USER_KEY, profile);
    }
    
    if (keycloak.token) {
      const tokens: AuthTokens = {
        access_token: keycloak.token,
        refresh_token: keycloak.refreshToken || '',
        id_token: keycloak.idToken || '',
        expires_in: keycloak.timeSkew || 0,
        refresh_expires_in: 0, // Keycloak doesn't expose refreshExpiresIn directly
      };
      await set(TOKENS_KEY, tokens);
    }
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
};

/**
 * Get stored user data from IndexedDB
 */
export const getStoredUserData = async (): Promise<UserProfile | null> => {
  try {
    return await get(AUTH_USER_KEY);
  } catch (error) {
    console.error('Failed to get stored user data:', error);
    return null;
  }
};

/**
 * Clear stored user data
 */
export const clearStoredUserData = async (): Promise<void> => {
  try {
    await del(AUTH_USER_KEY);
    await del(TOKENS_KEY);
  } catch (error) {
    console.error('Failed to clear stored user data:', error);
  }
}; 