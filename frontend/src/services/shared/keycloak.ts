import Keycloak from "keycloak-js";
import { keycloakConfig } from "./keycloakConfig";

/**
 * Initializes Keycloak instance with configuration.
 */

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
