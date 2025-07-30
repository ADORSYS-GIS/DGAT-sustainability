import React from 'react';
import { useKeycloak, KeycloakProvider, getKeycloakInstance } from './keycloakProvider';
import { getTokens, getDecodedIdToken, isUserLoggedIn } from './keycloakService';

// Re-export the Keycloak provider as OidcProvider for compatibility
export const OidcProvider = KeycloakProvider;

// Create a compatibility hook that mimics the oidc-spa useOidc interface
export const useOidc = () => {
  const keycloak = useKeycloak();
  
  return {
    isUserLoggedIn: keycloak.isAuthenticated,
    decodedIdToken: keycloak.user,
    login: (options?: { doesCurrentHrefRequiresAuth?: boolean }) => keycloak.login(),
    logout: (options?: { redirectTo?: string }) => keycloak.logout(),
    getTokens: keycloak.getTokens,
    // Add organization information for compatibility
    primaryOrganization: keycloak.primaryOrganization,
    userCategories: keycloak.userCategories,
  };
};

// Create a compatibility function that mimics the oidc-spa getOidc interface
export const getOidc = async () => {
  const keycloak = getKeycloakInstance();
  
  return {
    isUserLoggedIn: keycloak.authenticated,
    decodedIdToken: await getDecodedIdToken(),
    login: (options?: { doesCurrentHrefRequiresAuth?: boolean }) => keycloak.login(),
    logout: (options?: { redirectTo?: string }) => keycloak.logout(),
    getTokens: async () => {
      await keycloak.updateToken(30);
      return {
        accessToken: keycloak.token,
        refreshToken: keycloak.refreshToken,
        idToken: keycloak.idToken,
      };
    },
  };
};

// Export withLoginEnforced and enforceLogin for compatibility (these would need to be implemented if used)
export const withLoginEnforced = (Component: React.ComponentType<Record<string, unknown>>) => {
  const WrappedComponent = (props: Record<string, unknown>) => {
    const { isAuthenticated, loading } = useKeycloak();
    
    if (loading) {
      return React.createElement('div', null, 'Loading...');
    }
    
    if (!isAuthenticated) {
      return React.createElement('div', null, 'Please log in to access this page.');
    }
    
    return React.createElement(Component, props);
  };
  
  return WrappedComponent;
};

// Note: enforceLogin should be used within a React component context
export const enforceLogin = () => {
  // This function should be called from within a React component
  // where useKeycloak can be used properly
  console.warn('enforceLogin should be called from within a React component');
};

// Helper function for authenticated API calls (maintains same interface)
export const fetchWithAuth: typeof fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const keycloak = getKeycloakInstance();
  
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
