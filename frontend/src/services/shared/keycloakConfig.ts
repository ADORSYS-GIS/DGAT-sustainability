import Keycloak from "keycloak-js";

/**
 * Keycloak configuration for the sustainability assessment tool
 */
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://ec2-56-228-63-114.eu-north-1.compute.amazonaws.com/keycloak",
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
  onLoad: "check-sso",
  silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
  pkceMethod: "S256",
  checkLoginIframe: false,
  enableLogging: import.meta.env.DEV,
}; 