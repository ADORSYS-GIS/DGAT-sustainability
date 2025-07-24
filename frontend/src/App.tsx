import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { initializeAuth } from "./services/shared/authService";
import "@/services/syncService"; // Ensure the sync service is initialized

const App = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useInitialDataLoad(); // Pre-load data for offline use

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize Keycloak authentication without forcing login
        const isAuth = await initializeAuth();
        console.log('Authentication status:', isAuth ? 'Authenticated' : 'Not authenticated');
        setAuthenticated(isAuth);
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner text="Initializing..." />
        </div>
    );
  }

  return <AppRouter />;
};

export default App;