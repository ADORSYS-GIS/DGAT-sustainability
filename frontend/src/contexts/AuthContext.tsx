import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { keycloak } from "../services/shared/keycloakConfig";
import {
  getAuthState,
  getStoredUserProfile,
  login as authLogin,
  logout as authLogout,
  initializeAuth,
  setupTokenRefresh,
  AuthState
} from "../services/shared/authService";

const INACTIVITY_LOGOUT_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousedown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

interface AuthContextState extends AuthState {
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    roles: [],
    loading: true,
  });

  useEffect(() => {
    const updateAuthState = async () => {
      const state = getAuthState();

      // If Keycloak says not authenticated but we're offline, try the stored profile
      if (!state.isAuthenticated && !navigator.onLine) {
        const storedProfile = await getStoredUserProfile();
        if (storedProfile) {
          console.log("Offline: restoring auth state from stored profile.");
          setAuthState({
            isAuthenticated: true,
            user: storedProfile,
            roles: storedProfile.roles || storedProfile.realm_access?.roles || [],
            loading: false,
          });
          return;
        }
      }

      setAuthState({ ...state, loading: false });
    };

    const initializeKeycloak = async () => {
      // Fast path: if offline, immediately restore from stored profile before doing anything else
      if (!navigator.onLine) {
        const storedProfile = await getStoredUserProfile();
        if (storedProfile) {
          console.log("Offline fast path: restoring session immediately.");
          setAuthState({
            isAuthenticated: true,
            user: storedProfile,
            roles: storedProfile.roles || storedProfile.realm_access?.roles || [],
            loading: false,
          });
          // Still run initializeAuth in background to set up keycloak.tokenParsed
          initializeAuth().catch(() => {});
          return;
        }
      }

      // Prevent re-initialization if we already have a valid token
      if (keycloak.authenticated || keycloak.token) {
        await updateAuthState();
        return;
      }

      try {
        const authenticated = await initializeAuth();
        if (authenticated && navigator.onLine) {
          setupTokenRefresh();
        }
      } catch (error) {
        console.error("Failed to initialize Keycloak in AuthProvider:", error);
      } finally {
        await updateAuthState();
      }
    };

    initializeKeycloak();

    const onAuthSuccess = () => {
      console.log("Authentication successful (AuthProvider)");
      updateAuthState();
    };
    const onAuthLogout = () => {
      console.log("User logged out (AuthProvider)");
      setAuthState({ isAuthenticated: false, user: null, roles: [], loading: false });
    };
    const onAuthError = (error: unknown) => {
      console.error("Authentication error (AuthProvider):", error);
      // Don't clear auth state on error if offline — keep the stored session
      if (!navigator.onLine) {
        console.log("Offline: ignoring auth error, keeping existing state.");
        updateAuthState();
        return;
      }
      setAuthState({ isAuthenticated: false, user: null, roles: [], loading: false });
    };
    const onTokenExpired = () => {
      console.log("Token expired, attempting refresh... (AuthProvider)");
      if (!navigator.onLine) {
        console.log("Offline — skipping token refresh, keeping existing auth state.");
        return;
      }
      keycloak.updateToken(30).then(refreshed => {
        if (refreshed) {
          updateAuthState();
        }
      }).catch(err => {
        console.warn("Token refresh failed:", err);
      });
    };

    keycloak.onAuthSuccess = onAuthSuccess;
    keycloak.onAuthLogout = onAuthLogout;
    keycloak.onAuthError = onAuthError;
    keycloak.onTokenExpired = onTokenExpired;

    const handleOnline = () => {
      console.log("Application is back online. Re-initializing Keycloak.");
      initializeKeycloak();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthError = undefined;
      keycloak.onTokenExpired = undefined;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const login = useCallback(async () => {
    try {
      await authLogin();
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setAuthState({ isAuthenticated: false, user: null, roles: [], loading: false });
    }
  }, []);

  useEffect(() => {
    if (!authState.isAuthenticated) {
      return;
    }

    let inactivityTimer: ReturnType<typeof window.setTimeout>;

    const resetInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        logout();
      }, INACTIVITY_LOGOUT_MS);
    };

    resetInactivityTimer();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    return () => {
      window.clearTimeout(inactivityTimer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [authState.isAuthenticated, logout]);

  const value = { ...authState, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
