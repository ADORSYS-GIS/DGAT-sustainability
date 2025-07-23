import { createOidc } from "oidc-spa";
import { validateOidcConfig, getRedirectUri } from "../../utils/oidcUtils";

// Validate OIDC configuration
try {
  validateOidcConfig();
} catch (error) {
  console.error("OIDC Configuration Error:", error);
}

// Log all environment variables for debugging
console.log("=== OIDC Environment Variables in oidc.ts ====");
console.log({
  VITE_KEYCLOAK_ISSUER_URI: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  VITE_KEYCLOAK_CLIENT_ID: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  VITE_KEYCLOAK_HOME_URL: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  VITE_KEYCLOAK_REDIRECT_URI: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI,
  VITE_KEYCLOAK_SCOPES: import.meta.env.VITE_KEYCLOAK_SCOPES,
});

// Get the redirect URI with fallback
const redirectUri = getRedirectUri();
console.log("Using redirect URI:", redirectUri);

export const oidcPromise = createOidc({
  // Required core parameters
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirectUri: redirectUri,
  homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL || "http://13.49.74.167",

  // Based on OIDC-SPA examples
  scope: import.meta.env.VITE_KEYCLOAK_SCOPES || "openid profile email",
  responseType: "code",


  // Silent renewal configuration
  silentSigninRedirectUri: `${import.meta.env.VITE_KEYCLOAK_HOME_URL}/silent-renew.html`,
  automaticSilentRenew: true,
  silentSigninTimeoutInMs: 15000,

  // Additional security settings
  loadUserInfo: true,
  enableLogging: true,
  enableDebugLogs: true,
});
