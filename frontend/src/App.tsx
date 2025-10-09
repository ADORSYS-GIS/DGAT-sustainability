import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { useAuth } from "./hooks/shared/useAuth";
import "@/services/syncService";

// Component for authenticated users that handles data loading
const AuthenticatedUserApp = () => {
  const { isLoading: dataLoading } = useInitialDataLoad();

  // Don't show separate data loading - it's handled in the main auth loading
  return <AppRouter />;
};

// Component for unauthenticated users (no data loading)
const UnauthenticatedApp = () => {
  return <AppRouter />;
};

// Separate component that uses authentication hooks
const AuthenticatedApp = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useInitialDataLoad();

  // Show unified loading state for both authentication and data loading
  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner text="Loading your data..." />
      </div>
    );
  }

  // Render different components based on authentication status
  return isAuthenticated ? <AuthenticatedUserApp /> : <UnauthenticatedApp />;
};

const App = () => {
  return <AuthenticatedApp />;
};

export default App;