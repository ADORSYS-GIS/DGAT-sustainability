import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Keycloak from 'keycloak-js';
import { initKeycloakAuth, getKeycloak, getDecodedIdToken, isUserLoggedIn, DecodedIdToken, getPrimaryOrganization, getUserCategories } from './keycloakService';
import { QueryClient } from '@tanstack/react-query';

interface KeycloakContextType {
  keycloak: Keycloak | null;
  isAuthenticated: boolean;
  user: DecodedIdToken | null;
  roles: string[];
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getTokens: () => Promise<{ accessToken?: string; refreshToken?: string; idToken?: string }>;
  // Organization-related properties
  primaryOrganization: { name: string; details: { id: string; categories: string[] } } | null;
  userCategories: string[];
}

const KeycloakContext = createContext<KeycloakContextType | undefined>(undefined);

interface KeycloakProviderProps {
  children: ReactNode;
}

// Global variable to track Keycloak initialization
declare global {
  var keycloakInitialized: boolean;
  var queryClient: QueryClient;
}

if (typeof globalThis.keycloakInitialized === 'undefined') {
  globalThis.keycloakInitialized = false;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<DecodedIdToken | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryOrganization, setPrimaryOrganization] = useState<{ name: string; details: { id: string; categories: string[] } } | null>(null);
  const [userCategories, setUserCategories] = useState<string[]>([]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log("🔄 Initializing Keycloak...");
        
        const kc = await initKeycloakAuth();
        setKeycloak(kc);
        
        if (kc.authenticated) {
          setIsAuthenticated(true);
          
          // Get user data
          const decodedToken = await getDecodedIdToken();
          setUser(decodedToken);
          
          // Extract roles
          const userRoles = decodedToken?.roles || decodedToken?.realm_access?.roles || [];
          setRoles(userRoles);
          
          // Extract organization information
          if (decodedToken) {
            const primaryOrg = getPrimaryOrganization(decodedToken);
            setPrimaryOrganization(primaryOrg);
            
            const categories = getUserCategories(decodedToken);
            setUserCategories(categories);
            
            console.log("✅ Keycloak initialized - User authenticated:", {
              username: decodedToken?.preferred_username,
              roles: userRoles,
              organization: primaryOrg?.name,
              categories: categories
            });
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setRoles([]);
          setPrimaryOrganization(null);
          setUserCategories([]);
          console.log("✅ Keycloak initialized - User not authenticated");
        }
        
        // Notify that Keycloak is initialized
        globalThis.keycloakInitialized = true;
        
        // If user is authenticated, retry failed queries
        if (kc.authenticated && globalThis.queryClient) {
          console.log("🔄 Retrying failed queries after authentication...");
          // Wait a bit for the token to be properly set
          setTimeout(() => {
            globalThis.queryClient.invalidateQueries();
          }, 500);
        }
        
      } catch (error) {
        console.error('❌ Failed to initialize Keycloak auth:', error);
        setIsAuthenticated(false);
        setUser(null);
        setRoles([]);
        setPrimaryOrganization(null);
        setUserCategories([]);
        
        // Still notify that initialization is complete (even if failed)
        globalThis.keycloakInitialized = true;
      } finally {
        setLoading(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("⚠️ Keycloak initialization timeout, setting loading to false");
        setLoading(false);
        setIsAuthenticated(false);
        globalThis.keycloakInitialized = true;
      }
    }, 5000); // 5 second timeout

    initializeAuth();

    return () => clearTimeout(timeoutId);
  }, []);

  // Set up token refresh and user data updates
  useEffect(() => {
    if (!keycloak) return;

    const updateUserData = async () => {
      if (keycloak.authenticated) {
        const decodedToken = await getDecodedIdToken();
        setUser(decodedToken);
        
        const userRoles = decodedToken?.roles || decodedToken?.realm_access?.roles || [];
        setRoles(userRoles);
        
        // Update organization information
        if (decodedToken) {
          const primaryOrg = getPrimaryOrganization(decodedToken);
          setPrimaryOrganization(primaryOrg);
          
          const categories = getUserCategories(decodedToken);
          setUserCategories(categories);
        }
      }
    };

    // Update user data when authentication state changes
    const handleAuthSuccess = () => {
      setIsAuthenticated(true);
      updateUserData();
      console.log("✅ Authentication successful");
      
      // Retry failed queries after successful authentication
      if (globalThis.queryClient) {
        setTimeout(() => {
          globalThis.queryClient.invalidateQueries();
        }, 500);
      }
    };

    const handleAuthLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      setRoles([]);
      setPrimaryOrganization(null);
      setUserCategories([]);
      console.log("👋 User logged out");
    };

    const handleAuthError = () => {
      setIsAuthenticated(false);
      setUser(null);
      setRoles([]);
      setPrimaryOrganization(null);
      setUserCategories([]);
      console.log("❌ Authentication error");
    };

    // Add event listeners
    keycloak.onAuthSuccess = handleAuthSuccess;
    keycloak.onAuthLogout = handleAuthLogout;
    keycloak.onAuthError = handleAuthError;

    return () => {
      // Clean up event listeners
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthError = undefined;
    };
  }, [keycloak]);

  const login = async () => {
    if (!keycloak) return;
    await keycloak.login();
  };

  const logout = async () => {
    if (!keycloak) return;
    await keycloak.logout({
      redirectUri: window.location.origin + '/',
    });
  };

  const getTokens = async () => {
    if (!keycloak) return {};
    
    try {
      await keycloak.updateToken(30);
      return {
        accessToken: keycloak.token,
        refreshToken: keycloak.refreshToken,
        idToken: keycloak.idToken,
      };
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return {};
    }
  };

  const value: KeycloakContextType = {
    keycloak,
    isAuthenticated,
    user,
    roles,
    loading,
    login,
    logout,
    getTokens,
    primaryOrganization,
    userCategories,
  };

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
};

export const useKeycloak = (): KeycloakContextType => {
  const context = useContext(KeycloakContext);
  if (context === undefined) {
    throw new Error('useKeycloak must be used within a KeycloakProvider');
  }
  return context;
};

// Export a function to get Keycloak instance outside of React components
export const getKeycloakInstance = (): Keycloak => {
  return getKeycloak();
}; 