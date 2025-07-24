import { useEffect, useState } from "react";
import { oidcPromise } from "../../services/shared/oidc";

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
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let cancelled = false;

    console.log("[useAuth] Initializing OIDC client...");

    oidcPromise
      .then((resolvedOidc) => {
        if (cancelled) return;

        console.log("[useAuth] OIDC client initialized successfully");
        setOidc(resolvedOidc);
        setSnapshot(getSnapshot(resolvedOidc));

        // Set a shorter interval for more responsive authentication state updates
        interval = setInterval(() => {
          setSnapshot(getSnapshot(resolvedOidc));
        }, 5000); // 5 second polling interval for better responsiveness
      })
      .catch((error) => {
        console.error("[useAuth] Error initializing OIDC client:", error);
        // Even with error, try to initialize basic functionality
        setSnapshot({
          isAuthenticated: false,
          user: null,
          roles: [],
          login: () => {
            console.error("[useAuth] Login unavailable due to OIDC initialization error");
            // Fallback to basic redirect if possible
            window.location.href = import.meta.env.VITE_KEYCLOAK_ISSUER_URI + "/protocol/openid-connect/auth?client_id=" + 
              import.meta.env.VITE_KEYCLOAK_CLIENT_ID + "&redirect_uri=" + 
              encodeURIComponent(window.location.origin + "/callback") + "&response_type=code";
          },
          logout: () => {},
          loading: false
        });
      });

    return () => {
      console.log("[useAuth] Cleaning up OIDC polling");
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSnapshot(oidcInstance: any) {
    if (!oidcInstance) {
      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        login: () => {
          console.log("[useAuth] Login called but OIDC instance not yet initialized");
        },
        logout: () => {
          console.log("[useAuth] Logout called but OIDC instance not yet initialized");
        },
        loading: true,
      };
    }
    if (oidcInstance.isUserLoggedIn) {
      const tokens = oidcInstance.getTokens();
      const user = tokens.decodedIdToken;
      // Debug log with more information
      console.log("[useAuth] User authenticated:", { 
        tokenAvailable: !!tokens, 
        userAvailable: !!user,
        loginFunctionAvailable: typeof oidcInstance.login === "function"
      });
      const roles = user?.roles || user?.realm_access?.roles || [];
      return {
        isAuthenticated: true,
        user,
        roles,
        // Keep login function available even when authenticated
        login: typeof oidcInstance.login === "function"
          ? () => oidcInstance.login({ doesCurrentHrefRequiresAuth: true })
          : () => {
              console.error("[useAuth] Login function not available on OIDC instance");
            },
        logout: typeof oidcInstance.logout === "function"
          ? () => oidcInstance.logout()
          : () => {
              console.error("[useAuth] Logout function not available on OIDC instance");
            },
        loading: false,
      };
    } else {
      // Debug log when not authenticated
      console.log("[useAuth] User not authenticated, login function available:", 
        typeof oidcInstance.login === "function");

      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        login: typeof oidcInstance.login === "function"
          ? () => {
              console.log("[useAuth] Triggering login flow");
              return oidcInstance.login({ doesCurrentHrefRequiresAuth: true });
            }
          : () => {
              console.error("[useAuth] Login function not available on OIDC instance");
            },
        logout: typeof oidcInstance.logout === "function"
          ? () => oidcInstance.logout()
          : () => {},
        loading: false,
      };
    }
  }

  return snapshot;
};