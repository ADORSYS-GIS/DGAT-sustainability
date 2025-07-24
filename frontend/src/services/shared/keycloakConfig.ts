import Keycloak from 'keycloak-js';

// Keycloak configuration
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};

// Initialize Keycloak instance
export const keycloak = new Keycloak(keycloakConfig);

// Keycloak initialization options
export const keycloakInitOptions: Keycloak.KeycloakInitOptions = {
  checkLoginIframe: false,
  onLoad: 'check-sso',
  pkceMethod: 'S256',
  enableLogging: import.meta.env.DEV,
}; 