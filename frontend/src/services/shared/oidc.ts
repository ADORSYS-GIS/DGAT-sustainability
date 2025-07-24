import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  // Add silent_redirect_uri dynamically based on the current URL
  silent_redirect_uri: window.location.origin + "/silent-renew.html",
  // Ensure redirect_uri is also set properly
  redirect_uri: window.location.origin + "/callback",
  // Add post logout redirect URI 
  post_logout_redirect_uri: window.location.origin,
});