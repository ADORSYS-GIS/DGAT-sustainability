import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenAPI } from "@/openapi-rq/requests";
import { getOidc, OidcProvider } from "@/services/shared/oidc";
import './i18n';

// Register OpenAPI request middleware to add Bearer token
OpenAPI.interceptors.request.use(async (request) => {
  try {
    const oidc = await getOidc();
    if (oidc && oidc.isUserLoggedIn) {
      const { accessToken } = await oidc.getTokens();
      if (accessToken) {
        if (!request.headers) request.headers = {};
        // If headers is a Headers object, convert to plain object
        if (
          typeof Headers !== "undefined" &&
          request.headers instanceof Headers
        ) {
          request.headers.set("Authorization", `Bearer ${accessToken}`);
        } else {
          request.headers["Authorization"] = `Bearer ${accessToken}`;
        }
      }
    }
  } catch (error) {
    console.warn("Failed to get OIDC token for request:", error);
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

// Service Worker Registration
if ('serviceWorker' in navigator) {
  // Temporarily disable service worker registration for development
  // Uncomment the following lines when ready to enable PWA features
  
  // window.addEventListener('load', () => {
  //   navigator.serviceWorker.register('/sw.js')
  //     .then((registration) => {
  //       console.log('Service Worker registered successfully:', registration);
  //     })
  //     .catch((error) => {
  //       console.error('Service Worker registration failed:', error);
  //     });
  // });

  // Listen for service worker updates
  // navigator.serviceWorker.addEventListener('message', (event) => {
  //   if (event.data && event.data.type === 'SKIP_WAITING') {
  //     console.log('New service worker available');
  //     window.location.reload();
  //   }
  // });
} else {
  // Service worker not supported
}

// Initialize offline services
try {
  // Initialize IndexedDB and other offline services
  // This ensures the database is ready when the app loads
  // await offlineDB.initialize();
  
  // Initialize sync service
  // const syncService = new SyncService();
  // syncService.listenForOnlineStatus();
  
  // Initialize API interceptor
  // apiInterceptor.setupNetworkListeners();
  // apiInterceptor.setupPeriodicSync();
} catch (error) {
  // Silently handle initialization errors
}

createRoot(document.getElementById("root")!).render(
  <OidcProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </OidcProvider>
);
