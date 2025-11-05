import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { keycloak } from "../services/shared/keycloakConfig";
import {
  getAuthState,
  login as authLogin,
  logout as authLogout,
  initializeAuth,
  setupTokenRefresh,
  AuthState
} from "../services/shared/authService";

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
    const updateAuthState = () => {
      const state = getAuthState();
      setAuthState(state);
    };

    const initializeKeycloak = async () => {
      // Prevent re-initialization if we already have a valid token
      if (keycloak.authenticated || keycloak.token) {
        updateAuthState();
        return;
      }

      try {
        const authenticated = await initializeAuth();
        if (authenticated) {
          setupTokenRefresh();
        }
      } catch (error) {
        console.error("Failed to initialize Keycloak in AuthProvider:", error);
      } finally {
        updateAuthState();
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
    const onAuthError = (error) => {
      console.error("Authentication error (AuthProvider):", error);
      setAuthState({ isAuthenticated: false, user: null, roles: [], loading: false });
    };
    const onTokenExpired = () => {
      console.log("Token expired, attempting refresh... (AuthProvider)");
      keycloak.updateToken(30).then(refreshed => {
        if (refreshed) {
          updateAuthState();
        }
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
    }
  }, []);

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