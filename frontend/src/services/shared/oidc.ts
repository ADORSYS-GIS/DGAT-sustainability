import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
});