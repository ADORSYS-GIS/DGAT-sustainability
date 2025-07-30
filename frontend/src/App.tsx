import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { KeycloakProvider } from "./services/shared/keycloakProvider";
import "@/services/syncService"; // Ensure the sync service is initialized

const App = () => {
  const [loading, setLoading] = useState(false);
  useInitialDataLoad(); // Pre-load data for offline use

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Initializing..." />
      </div>
    );
  }

  return (
    <KeycloakProvider>
      <AppRouter />
    </KeycloakProvider>
  );
};

export default App;
