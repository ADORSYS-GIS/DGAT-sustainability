import Keycloak from "keycloak-js";

/**
 * Keycloak configuration for the sustainability assessment tool
 */
export const keycloakConfig = {
  url: "http://localhost:8080",
  realm: "sustainability-realm",
  clientId: "sustainability-tool",
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
  onLoad: "check-sso",
  silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
  pkceMethod: "S256",
  checkLoginIframe: false,
  enableLogging: import.meta.env.DEV,
}; 