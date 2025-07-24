import Keycloak from 'keycloak-js';

// Keycloak configuration
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};

// Initialize Keycloak instance
export const keycloak = new Keycloak(keycloakConfig);

// Check if we're in a sandbox environment
const isSandboxEnvironment = () => {
  return window.location.hostname.includes('sandbox') || 
         window.location.hostname.includes('test') ||
         !window.crypto?.subtle;
};

// Keycloak initialization options - adapted for environment
export const keycloakInitOptions: Keycloak.KeycloakInitOptions = {
  checkLoginIframe: false,
  onLoad: 'check-sso',
  // Disable PKCE for sandbox environments
  ...(isSandboxEnvironment() ? {} : { pkceMethod: 'S256' }),
  enableLogging: import.meta.env.DEV,
}; 