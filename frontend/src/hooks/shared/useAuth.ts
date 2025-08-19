import React from "react";
import { keycloak } from "../../services/shared/keycloakConfig";
import {
  getAuthState,
  login as authLogin,
  logout as authLogout,
  AuthState,
} from "../../services/shared/authService";

interface AuthHookState extends AuthState {
  login: () => void;
  logout: () => void;
}

/**
 * React hook for Keycloak authentication state.
 * Returns: { isAuthenticated, user, roles, login, logout, loading }
 */
export const useAuth = (): AuthHookState => {
  const [authState, setAuthState] = React.useState<AuthState>({
    isAuthenticated: false,
    user: null,
    roles: [],
    loading: true,
  });

  // Update auth state when Keycloak state changes
  React.useEffect(() => {
    const updateAuthState = () => {
      const state = getAuthState();
      setAuthState(state);
    };

    // Set a timeout to stop loading if Keycloak takes too long
    const loadingTimeout = setTimeout(() => {
      setAuthState((prev) => ({ ...prev, loading: false }));
    }, 3000); // Stop loading after 3 seconds

    // Initial state check
    const checkInitialState = async () => {
      try {
        // If Keycloak is already initialized, get the state immediately
        if (keycloak.authenticated !== undefined) {
          updateAuthState();
          clearTimeout(loadingTimeout);
        } else {
          // If Keycloak is not initialized yet, wait a bit and check again
          setTimeout(() => {
            updateAuthState();
            clearTimeout(loadingTimeout);
          }, 100);
        }
      } catch (error) {
        console.error("Error checking initial auth state:", error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          roles: [],
          loading: false,
        });
        clearTimeout(loadingTimeout);
      }
    };

    checkInitialState();

    // Listen for Keycloak events
    const onTokenExpired = () => {
      console.log("Token expired, attempting refresh...");
      updateAuthState();
    };

    const onAuthSuccess = () => {
      console.log("Authentication successful");
      updateAuthState();
      clearTimeout(loadingTimeout);
    };

    const onAuthLogout = () => {
      console.log("User logged out");
      setAuthState({
        isAuthenticated: false,
        user: null,
        roles: [],
        loading: false,
      });
      clearTimeout(loadingTimeout);
    };

    const onAuthError = () => {
      console.error("Authentication error");
      setAuthState({
        isAuthenticated: false,
        user: null,
        roles: [],
        loading: false,
      });
      clearTimeout(loadingTimeout);
    };

    // Add event listeners
    keycloak.onTokenExpired = onTokenExpired;
    keycloak.onAuthSuccess = onAuthSuccess;
    keycloak.onAuthLogout = onAuthLogout;
    keycloak.onAuthError = onAuthError;

    // Cleanup function
    return () => {
      clearTimeout(loadingTimeout);
      keycloak.onTokenExpired = undefined;
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthError = undefined;
    };
  }, []);

  const login = React.useCallback(async () => {
    try {
      await authLogin();
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
  };
};
