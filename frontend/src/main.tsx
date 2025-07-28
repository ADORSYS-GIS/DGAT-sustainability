import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenAPI } from "@/openapi-rq/requests";
import { getKeycloakInstance } from "@/services/shared/keycloakProvider";
import './i18n';

// Register OpenAPI request middleware to add Bearer token
OpenAPI.interceptors.request.use(async (request) => {
  try {
    // Get Keycloak instance
    const keycloak = getKeycloakInstance();
    
    // If Keycloak is not yet initialized, wait for it
    if (!globalThis.keycloakInitialized) {
      console.log("⏳ Keycloak not yet initialized, waiting...");
      
      // Wait for Keycloak to initialize (max 5 seconds)
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5 seconds
      
      while (!globalThis.keycloakInitialized && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!globalThis.keycloakInitialized) {
        console.warn("⚠️ Keycloak initialization timeout, proceeding without token");
      }
    }
    
    // Check if user is authenticated and token exists
    if (keycloak && keycloak.authenticated && keycloak.token) {
      try {
        // Update token if needed (refresh if expires in less than 30 seconds)
        await keycloak.updateToken(30);
        
        if (keycloak.token) {
          if (!request.headers) request.headers = {};
          // If headers is a Headers object, convert to plain object
          if (
            typeof Headers !== "undefined" &&
            request.headers instanceof Headers
          ) {
            request.headers.set("Authorization", `Bearer ${keycloak.token}`);
          } else {
            request.headers["Authorization"] = `Bearer ${keycloak.token}`;
          }
          
          console.log("✅ Added Bearer token to request");
        }
      } catch (tokenError) {
        console.warn("⚠️ Failed to update token:", tokenError);
        // Even if token refresh fails, try to use the existing token
        if (keycloak.token) {
          if (!request.headers) request.headers = {};
          if (
            typeof Headers !== "undefined" &&
            request.headers instanceof Headers
          ) {
            request.headers.set("Authorization", `Bearer ${keycloak.token}`);
          } else {
            request.headers["Authorization"] = `Bearer ${keycloak.token}`;
          }
          console.log("✅ Added existing Bearer token to request (refresh failed)");
        }
      }
    } else {
      console.log("❌ No valid token available for request - Auth state:", {
        hasKeycloak: !!keycloak,
        authenticated: keycloak?.authenticated,
        hasToken: !!keycloak?.token,
        initialized: globalThis.keycloakInitialized
      });
    }
  } catch (error) {
    console.warn("❌ Failed to get Keycloak token for request:", error);
  }
  return request;
});

// Function to mark Keycloak as initialized (called from KeycloakProvider)
export const setKeycloakInitialized = (initialized: boolean) => {
  globalThis.keycloakInitialized = initialized;
};

// Configure QueryClient for offline-first behavior
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time for better offline experience
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep data in cache longer
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Retry failed queries
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        // Don't retry if Keycloak is not initialized yet
        if (!globalThis.keycloakInitialized) return false;
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      // Don't refetch on window focus if offline or Keycloak not initialized
      refetchOnWindowFocus: () => navigator.onLine && globalThis.keycloakInitialized,
      // Always refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount, error) => {
        // Don't retry if offline (mutations should be queued instead)
        if (!navigator.onLine) return false;
        // Don't retry if Keycloak is not initialized yet
        if (!globalThis.keycloakInitialized) return false;
        return failureCount < 2;
      },
    },
  },
});

// Make queryClient globally available for Keycloak provider
globalThis.queryClient = queryClient;

// Initialize offline services
async function initializeOfflineServices() {
  try {
    // Register service worker
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("Service Worker registered successfully:", registration);

      // Listen for service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker is available
              console.log("New service worker available");
              // You could show a notification to the user here
            }
          });
        }
      });
    }

    console.log("Offline services initialized successfully");
  } catch (error) {
    console.error("Failed to initialize offline services:", error);
  }
}

// Initialize offline services
initializeOfflineServices();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
