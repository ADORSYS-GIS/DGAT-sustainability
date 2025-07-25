/**
 * Utility functions for OIDC configuration
 */

/**
 * Validates that all required OIDC environment variables are present
 * @throws Error if any required variable is missing
 */
export function validateOidcConfig() {
  const requiredVars = [
    'VITE_KEYCLOAK_ISSUER_URI',
    'VITE_KEYCLOAK_CLIENT_ID',
    'VITE_KEYCLOAK_REDIRECT_URI',
    'VITE_KEYCLOAK_SCOPES'
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return value === undefined || value === '';
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required OIDC environment variables: ${missingVars.join(', ')}`);
  }

  console.log('OIDC configuration validated successfully');
}

import config from '../config/environments';

/**
 * Get the base URL of the application
 */
export function getBaseUrl(): string {
  return config.auth.homeUrl || window.location.origin;
}

/**
 * Get the redirect URI for OIDC
 */
export function getRedirectUri(): string {
  return config.auth.redirectUri || `${getBaseUrl()}/callback`;
}
