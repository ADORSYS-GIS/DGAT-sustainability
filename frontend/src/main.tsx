import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenAPI } from "@/openapi-rq/requests";
import { oidcPromise } from "@/services/shared/oidc";
import './i18n';

// Register OpenAPI request middleware to add Bearer token
OpenAPI.interceptors.request.use(async (request) => {
  const oidc = await oidcPromise;
  if (oidc && oidc.isUserLoggedIn) {
    const tokens = oidc.getTokens();
    if (tokens?.accessToken) {
      if (!request.headers) request.headers = {};
      // If headers is a Headers object, convert to plain object
      if (
        typeof Headers !== "undefined" &&
        request.headers instanceof Headers
      ) {
        request.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      } else {
        request.headers["Authorization"] = `Bearer ${tokens.accessToken}`;
      }
    }
  }
  return request;
});

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
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      // Don't refetch on window focus if offline
      refetchOnWindowFocus: () => navigator.onLine,
      // Always refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount, error) => {
        // Don't retry if offline (mutations should be queued instead)
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

// Initialize offline services
async function initializeOfflineServices() {
  try {
    // Register service worker
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/custom-sw.js", {
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
  </QueryClientProvider>,
);
