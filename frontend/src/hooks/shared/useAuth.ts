import { createOidc } from "oidc-spa";

// Debug: Log what we actually receive
console.log("=== OIDC Environment Variables Debug ===");
console.log("VITE_KEYCLOAK_ISSUER_URI:", import.meta.env.VITE_KEYCLOAK_ISSUER_URI);
console.log("VITE_KEYCLOAK_CLIENT_ID:", import.meta.env.VITE_KEYCLOAK_CLIENT_ID);
console.log("VITE_KEYCLOAK_HOME_URL:", import.meta.env.VITE_KEYCLOAK_HOME_URL);
console.log("All import.meta.env:", import.meta.env);

// Validate that we have all required values
const issuerUri = import.meta.env.VITE_KEYCLOAK_ISSUER_URI;
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const homeUrl = import.meta.env.VITE_KEYCLOAK_HOME_URL;

if (!issuerUri) {
  throw new Error("VITE_KEYCLOAK_ISSUER_URI is not defined");
}
if (!clientId) {
  throw new Error("VITE_KEYCLOAK_CLIENT_ID is not defined");
}
if (!homeUrl) {
  throw new Error("VITE_KEYCLOAK_HOME_URL is not defined");
}

console.log("Creating OIDC with:", { issuerUri, clientId, publicUrl: homeUrl });

export const oidcPromise = createOidc({
  issuerUri: issuerUri,
  clientId: clientId,
  publicUrl: homeUrl, // Changed from homeUrl to publicUrl
  
  // Additional configuration for debugging
  silentSigninTimeoutInMs: 15000,
  enableDebugLogs: true,
});