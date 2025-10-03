import React from "react";
import { keycloak } from "../../services/shared/keycloakConfig";
import {
  getAuthState,
  login as authLogin,
  logout as authLogout,
  initializeAuth,
  setupTokenRefresh,
  UserProfile,
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
      console.log("Auth state updated:", state);
      setAuthState(state);
    };

    // Initialize Keycloak if not already initialized
    const initializeKeycloak = async () => {
      // Check if Keycloak is already initialized
      if (keycloak.authenticated || keycloak.token) {
        // Already initialized, just update state
        updateAuthState();
        return;
      }

      // Check if Keycloak is in the process of initializing
      if (keycloak.authenticated === undefined) {
        console.log("Initializing Keycloak...");
        try {
          const authResult = await initializeAuth();
          console.log("Keycloak initialization result:", authResult);
          // Setup token refresh after successful initialization
          setupTokenRefresh();
        } catch (error) {
          console.error("Failed to initialize Keycloak in useAuth:", error);
          setAuthState({
            isAuthenticated: false,
            user: null,
            roles: [],
            loading: false,
          });
          return;
        }
      }

      // Update state after initialization
      updateAuthState();
    };

    // Initialize and get initial state
    initializeKeycloak();

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (authState.loading) {
        console.warn("Authentication timeout - setting loading to false");
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    }, 15000); // 15 second timeout

    return () => {
      clearTimeout(timeoutId);
    };

    // Listen for Keycloak events
    const onTokenExpired = () => {
      console.log("Token expired, attempting refresh...");
      updateAuthState();
    };

    const onAuthSuccess = () => {
      console.log("Authentication successful");
      updateAuthState();
    };

    const onAuthLogout = () => {
      console.log("User logged out");
      setAuthState({
        isAuthenticated: false,
        user: null,
        roles: [],
        loading: false,
      });
    };

    const onAuthError = () => {
      console.error("Authentication error");
      setAuthState({
        isAuthenticated: false,
        user: null,
        roles: [],
        loading: false,
      });
    };

    // Add event listeners
    keycloak.onTokenExpired = onTokenExpired;
    keycloak.onAuthSuccess = onAuthSuccess;
    keycloak.onAuthLogout = onAuthLogout;
    keycloak.onAuthError = onAuthError;

    // Cleanup function
    return () => {
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
