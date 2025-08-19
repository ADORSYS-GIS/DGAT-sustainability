import React from "react";
import { keycloak } from "../../services/shared/keycloakConfig";
import { 
  getAuthState, 
  login as authLogin, 
  logout as authLogout,
  UserProfile,
  AuthState 
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

    // Initial state
    updateAuthState();

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