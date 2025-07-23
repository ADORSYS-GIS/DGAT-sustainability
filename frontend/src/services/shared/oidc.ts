import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  redirect_uri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || import.meta.env.VITE_KEYCLOAK_HOME_URL,
  silent_redirect_uri: import.meta.env.VITE_KEYCLOAK_HOME_URL + "/silent-renew.html",
  post_logout_redirect_uri: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  silent_renew: true,
  loadUserInfo: true,
  automaticSilentRenew: true,
});