import { useEffect, useState } from "react";
import { createOidc } from "oidc-spa";

export const oidcPromise = createOidc({
  issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI || "http://13.49.74.167:8080/realms/sustainability-realm",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "sustainability-tool",
  publicUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL || "http://13.49.74.167", //

  // Optional: Add more specific configuration
  silentSigninTimeoutInMs: 15000, // Increase timeout
  enableDebugLogs: true,

  // Ensure proper redirect handling
  extraQueryParams: {},
}).catch(error => {
  console.error("OIDC initialization failed:", error);
  throw error;
});


/**
 * React hook for OIDC authentication state using oidc-spa.
 * Waits for the OIDC instance to be ready, then polls every 500ms.
 * Returns: { isAuthenticated, user, roles, login, logout, loading }
 */
export const useAuth = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [oidc, setOidc] = useState<any>(null);
  const [snapshot, setSnapshot] = useState({
    isAuthenticated: false,
    user: null,
    roles: [],
    login: () => {},
    logout: () => {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let cancelled = false;

    // Add error handling for OIDC initialization
    oidcPromise
        .then((resolvedOidc) => {
          if (cancelled) return;

          console.log("[useAuth] OIDC instance initialized successfully");
          setOidc(resolvedOidc);
          setSnapshot(getSnapshot(resolvedOidc));

          // Poll for auth state changes every 30 seconds
          interval = setInterval(() => {
            if (!cancelled) {
              setSnapshot(getSnapshot(resolvedOidc));
            }
          }, 30000);
        })
        .catch((error) => {
          if (cancelled) return;

          console.error("[useAuth] OIDC initialization failed:", error);
          setSnapshot({
            isAuthenticated: false,
            user: null,
            roles: [],
            login: () => {},
            logout: () => {},
            loading: false,
            error: error.message || "Authentication service initialization failed",
          });
        });

    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSnapshot(oidcInstance: any) {
    if (!oidcInstance) {
      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        login: () => {},
        logout: () => {},
        loading: true,
        error: null,
      };
    }

    try {
      if (oidcInstance.isUserLoggedIn) {
        const tokens = oidcInstance.getTokens();
        const user = tokens.decodedIdToken;

        console.log("[useAuth] User is logged in:", user?.preferred_username || user?.sub);

        // Extract roles from different possible locations
        const roles = user?.roles ||
            user?.realm_access?.roles ||
            user?.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles ||
            [];

        return {
          isAuthenticated: true,
          user,
          roles,
          login: () => {}, // Login function not needed when already logged in
          logout: typeof oidcInstance.logout === "function"
              ? () => oidcInstance.logout({ redirectTo: "home" })
              : () => {},
          loading: false,
          error: null,
        };
      } else {
        console.log("[useAuth] User is not logged in");

        return {
          isAuthenticated: false,
          user: null,
          roles: [],
          login: typeof oidcInstance.login === "function"
              ? () => {
                console.log("[useAuth] Initiating login...");
                oidcInstance.login({
                  doesCurrentHrefRequiresAuth: true,
                  // Add extra params if needed
                  extraQueryParams: {}
                });
              }
              : () => {
                console.error("[useAuth] Login function not available");
              },
          logout: () => {},
          loading: false,
          error: null,
        };
      }
    } catch (error) {
      console.error("[useAuth] Error in getSnapshot:", error);
      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        login: () => {},
        logout: () => {},
        loading: false,
        error: error instanceof Error ? error.message : "Authentication error",
      };
    }
  }

  return snapshot;
};
