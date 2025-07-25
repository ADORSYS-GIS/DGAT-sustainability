/**
 * Environment configuration
 */

// Detect the current environment
export const isProduction = window.location.hostname === '13.49.74.167';

// Dynamic configuration based on environment
const config = {
  // API configuration
  api: {
    baseUrl: isProduction 
      ? 'https://13.49.74.167/api'
      : 'https://localhost/api',
  },
  // Auth configuration
  auth: {
    keycloakBaseUrl: isProduction
      ? 'https://13.49.74.167/keycloak'
      : 'https://localhost/keycloak',
    issuerUri: isProduction
      ? 'https://13.49.74.167/keycloak/realms/sustainability-realm'
      : import.meta.env.VITE_KEYCLOAK_ISSUER_URI || 'https://localhost/keycloak/realms/sustainability-realm',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
    homeUrl: isProduction
      ? 'https://13.49.74.167'
      : import.meta.env.VITE_KEYCLOAK_HOME_URL || 'https://localhost',
    redirectUri: isProduction
      ? 'https://13.49.74.167/callback'
      : import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || 'https://localhost/callback',
    scopes: import.meta.env.VITE_KEYCLOAK_SCOPES || 'openid profile email',
  }
};

export default config;
