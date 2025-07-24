import Keycloak from 'keycloak-js';

// Keycloak configuration
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
  // Needed for self-signed certificates
  checkSsl: window.location.hostname === 'localhost' ? false : true,
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
  // Change from 'check-sso' to 'none' to prevent automatic redirects
  onLoad: 'none',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-renew.html',
  // Disable PKCE for sandbox environments
  ...(isSandboxEnvironment() ? {} : { pkceMethod: 'S256' }),
  enableLogging: import.meta.env.DEV,
  // SSL options
  checkSsl: window.location.protocol === 'https:' ? false : undefined,
}; 