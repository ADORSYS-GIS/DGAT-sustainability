import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { initializeAuth } from "./services/shared/authService";
import "@/services/syncService"; // Ensure the sync service is initialized

const App = () => {
  const [loading, setLoading] = useState(true);
  useInitialDataLoad(); // Pre-load data for offline use

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize Keycloak authentication
        await initializeAuth();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
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