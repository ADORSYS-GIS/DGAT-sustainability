import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
  silent_redirect_uri: "http://13.49.74.167/silent-renew.html",
  post_logout_redirect_uri: "http://13.49.74.167/",
  redirect_uri: "http://13.49.74.167/",

});