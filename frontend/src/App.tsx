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

  // Show loading spinner while authentication is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Checking authentication..." />
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
