import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirectUri: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  // Optional but recommended for security
  scopes: import.meta.env.VITE_KEYCLOAK_SCOPES || "openid profile email",
  // Enable for debugging
  enableDebugLogs: true,
});
