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
    oidcPromise.then((resolvedOidc) => {
      if (cancelled) return;
      setOidc(resolvedOidc);
      setSnapshot(getSnapshot(resolvedOidc));
      interval = setInterval(() => {
        setSnapshot(getSnapshot(resolvedOidc));
      }, 30000); // Increased polling interval to 5 seconds
    });
    return () => {
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
        login: () => {},
        logout: () => {},
        loading: true,
      };
    }
    if (oidcInstance.isUserLoggedIn) {
      const tokens = oidcInstance.getTokens();
      const user = tokens.decodedIdToken;
      // Removed noisy debug log
      console.log("[useAuth] decodedIdToken:", user);
      const roles = user?.roles || user?.realm_access?.roles || [];
      return {
        isAuthenticated: true,
        user,
        roles,
        login: () => {},
        logout:
          typeof oidcInstance.logout === "function"
            ? oidcInstance.logout
            : () => {},
        loading: false,
      };
    } else {
      return {
        isAuthenticated: false,
        user: null,
        roles: [],
        login:
          typeof oidcInstance.login === "function"
            ? () => oidcInstance.login({ doesCurrentHrefRequiresAuth: true })
            : () => {},
        logout: () => {},
        loading: false,
      };
    }
  }

  return snapshot;
};
