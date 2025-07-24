import Keycloak from 'keycloak-js';

// Keycloak configuration
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};

// Initialize Keycloak instance
export const keycloak = new Keycloak(keycloakConfig);

// Check if Web Crypto API is available
const isWebCryptoAvailable = typeof window !== 'undefined' && 
  window.crypto && 
  window.crypto.subtle;

// Keycloak initialization options
export const keycloakInitOptions: Keycloak.KeycloakInitOptions = {
  checkLoginIframe: false,
  onLoad: 'check-sso',
  // Only use PKCE if Web Crypto API is available
  ...(isWebCryptoAvailable && { pkceMethod: 'S256' }),
  enableLogging: import.meta.env.DEV,
}; 