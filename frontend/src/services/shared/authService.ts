import keycloak from "./keycloak";
import { get, set, clear } from "idb-keyval";
import type { UserProfile } from "../../types/auth";

/**
 * Initializes Keycloak on app startup. and checks if the user is already authenticateddd .
 */

export const initKeycloak = async (): Promise<boolean> => {
  try {
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      checkLoginIframe: false,
      pkceMethod: "S256",
    });
    if (authenticated) {
      await set("auth_user", {
        access_token: keycloak.token,
        refresh_token: keycloak.refreshToken,
        id_token: keycloak.idToken,
        roles: keycloak.realmAccess?.roles || [],
      });
    }
    return authenticated;
  } catch (error) {
    console.error("Keycloak init error:", error);
    return false;
  }
};

/**
 * Triggers the Keycloak login redirect.
 */

export const login = () =>
  keycloak.login({ redirectUri: window.location.origin + "/callback" });

/**
 * Triggers the Keycloak logout redirect and clears all app state.
 */

export const logout = async () => {
  await clear();
  keycloak.logout({ redirectUri: window.location.origin });
};

/**
 * Returns the current user info from Keycloak and local storage.
 */

export const getUser = async (): Promise<{
  isAuthenticated: boolean;
  token: string;
  roles: string[];
  profile: UserProfile;
} | null> => {
  const user = await get("auth_user");
  if (user && keycloak.token) {
    return {
      isAuthenticated: true,
      token: keycloak.token,
      roles: keycloak.realmAccess?.roles || [],
      profile: keycloak.tokenParsed as UserProfile,
    };
  }
  return null;
};

/*
 Gets the current access token.
 */

export const getToken = async (): Promise<string | null> => {
  if (keycloak.token) {
    await keycloak.updateToken(30);
    return keycloak.token;
  }
  const user = await get("auth_user");
  return user?.access_token || null;
};

/**
 * Handles the redirect from Keycloak after login, and store token and user infos.
 */

export const handleCallback = async (): Promise<{
  token: string;
  roles: string[];
  profile: UserProfile;
}> => {
  // Only initialize if not already authenticated
  if (!keycloak.authenticated) {
    const authenticated = await keycloak.init({
      onLoad: "login-required",
      checkLoginIframe: false,
      pkceMethod: "S256",
    });
    if (authenticated) {
      await set("auth_user", {
        access_token: keycloak.token,
        refresh_token: keycloak.refreshToken,
        id_token: keycloak.idToken,
        roles: keycloak.realmAccess?.roles || [],
      });
      return {
        token: keycloak.token,
        roles: keycloak.realmAccess?.roles || [],
        profile: keycloak.tokenParsed as UserProfile,
      };
    }
    throw new Error("Authentication failed");
  } else {
    // Already initialized, just return the user info
    return {
      token: keycloak.token,
      roles: keycloak.realmAccess?.roles || [],
      profile: keycloak.tokenParsed as UserProfile,
    };
  }
};
