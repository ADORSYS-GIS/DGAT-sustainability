import Keycloak from 'keycloak-js';
import { z } from 'zod';

// Define the schema for the decoded ID token (updated to match actual token structure)
const decodedIdTokenSchema = z.object({
  sub: z.string(),
  preferred_username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  realm_access: z.object({
    roles: z.array(z.string())
  }).optional(),
  organizations: z.record(z.string(), z.object({
    id: z.string(),
    categories: z.array(z.string())
  })).optional(),
  organisation_name: z.string().optional(),
  organisation: z.string().optional(),
});

// Type for decoded ID token
export type DecodedIdToken = z.infer<typeof decodedIdTokenSchema>;

// Type for organization details
export interface OrganizationDetails {
  id: string;
  categories: string[];
}

// Type for user profile
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  [key: string]: unknown;
}

// Keycloak configuration
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};

console.log('🔧 Keycloak configuration:', {
  url: keycloakConfig.url,
  realm: keycloakConfig.realm,
  clientId: keycloakConfig.clientId,
  env_issuer_uri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  env_client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

// Initialize Keycloak instance
let keycloakInstance: Keycloak | null = null;

/**
 * Initialize Keycloak instance
 */
export const initKeycloak = (): Keycloak => {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
};

/**
 * Get the Keycloak instance
 */
export const getKeycloak = (): Keycloak => {
  if (!keycloakInstance) {
    throw new Error('Keycloak not initialized. Call initKeycloak() first.');
  }
  return keycloakInstance;
};

/**
 * Initialize Keycloak and perform initial authentication check
 */
export const initKeycloakAuth = async (): Promise<Keycloak> => {
  const keycloak = initKeycloak();
  
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
    
    console.log('Keycloak initialized, authenticated:', authenticated);
    return keycloak;
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
    throw error;
  }
};

/**
 * Login function
 */
export const login = async (options?: { redirectUri?: string }): Promise<void> => {
  const keycloak = getKeycloak();
  await keycloak.login({
    redirectUri: options?.redirectUri || window.location.origin,
  });
};

/**
 * Logout function
 */
export const logout = async (options?: { redirectUri?: string }): Promise<void> => {
  const keycloak = getKeycloak();
  await keycloak.logout({
    redirectUri: options?.redirectUri || window.location.origin + '/',
  });
};

/**
 * Get current tokens
 */
export const getTokens = async (): Promise<{ accessToken?: string; refreshToken?: string; idToken?: string }> => {
  const keycloak = getKeycloak();
  
  try {
    // Update token if needed (refresh if expires in less than 30 seconds)
    await keycloak.updateToken(30);
    
    return {
      accessToken: keycloak.token,
      refreshToken: keycloak.refreshToken,
      idToken: keycloak.idToken,
    };
  } catch (error) {
    console.error('Failed to get tokens:', error);
    return {};
  }
};

/**
 * Get decoded ID token
 */
export const getDecodedIdToken = async (): Promise<DecodedIdToken | null> => {
  const keycloak = getKeycloak();
  
  if (!keycloak.idToken) {
    return null;
  }
  
  try {
    // Decode the JWT token (base64 decode the payload)
    const payload = keycloak.idToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    
    // Validate against schema
    const validated = decodedIdTokenSchema.parse(decoded);
    return validated;
  } catch (error) {
    console.error('Failed to decode ID token:', error);
    return null;
  }
};

/**
 * Get user's primary organization
 */
export const getPrimaryOrganization = (decodedToken: DecodedIdToken): { name: string; details: OrganizationDetails } | null => {
  if (!decodedToken.organizations || Object.keys(decodedToken.organizations).length === 0) {
    return null;
  }
  
  // Get the first organization (assuming it's the primary one)
  const [orgName, orgDetails] = Object.entries(decodedToken.organizations)[0];
  return {
    name: orgName,
    details: orgDetails
  };
};

/**
 * Get user's organization categories
 */
export const getUserCategories = (decodedToken: DecodedIdToken): string[] => {
  const primaryOrg = getPrimaryOrganization(decodedToken);
  return primaryOrg?.details.categories || [];
};

/**
 * Check if user is logged in
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
  const keycloak = getKeycloak();
  return !!keycloak.authenticated;
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  const keycloak = getKeycloak();
  
  if (!keycloak.authenticated) {
    return null;
  }
  
  try {
    const profile = await keycloak.loadUserProfile();
    return profile as UserProfile;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
};

/**
 * Helper function for authenticated API calls
 */
export const fetchWithAuth: typeof fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const keycloak = getKeycloak();
  
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
      
      (init ??= {}).headers = {
        ...init.headers,
        Authorization: `Bearer ${keycloak.token}`
      };
    } catch (error) {
      console.error('Failed to update token for API call:', error);
    }
  }

  return fetch(input, init);
};

// Export types for compatibility
export type { Keycloak }; 