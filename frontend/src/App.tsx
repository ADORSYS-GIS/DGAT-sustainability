import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { useAuth } from "./hooks/shared/useAuth";
import "@/services/syncService";

// Component for authenticated users that handles data loading
const AuthenticatedUserApp = () => {
  const { isLoading: dataLoading } = useInitialDataLoad();

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Loading your data..." />
      </div>
    );
  }

  return <AppRouter />;
};

// Component for unauthenticated users (no data loading)
const UnauthenticatedApp = () => {
  return <AppRouter />;
};

// Separate component that uses authentication hooks
const AuthenticatedApp = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Show a minimal loading state while authentication is being determined
  // This prevents the blank page issue while still showing something
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
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