import Keycloak from "keycloak-js";

/**
 * Keycloak configuration for the sustainability assessment tool
 */
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "sustainability-realm",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "sustainability-tool",
};

/**
 * Initialize Keycloak instance with configuration
 */
export const keycloak = new Keycloak({
  url: keycloakConfig.url,
  realm: keycloakConfig.realm,
  clientId: keycloakConfig.clientId,
});

/**
 * Keycloak initialization options
 */
export const keycloakInitOptions = {
  onLoad: "check-sso" as const,
  silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
  pkceMethod: "S256" as const,
  checkLoginIframe: false,
  enableLogging: import.meta.env.DEV,
  // Add timeout to prevent hanging
  promiseType: "native" as const,
  // Reduce timeout for faster initialization
  timeSkew: 0,
}; 