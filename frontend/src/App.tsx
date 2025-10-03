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

  // Temporary: Show a test page when authentication fails
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Sustainability Assessment Tool</h1>
          <p className="text-muted-foreground mb-4">
            Keycloak authentication is not available. The app is running in development mode.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Backend API: <span className="text-green-600">Running</span></p>
            <p>• Keycloak: <span className="text-red-600">Not running</span></p>
            <p>• Frontend: <span className="text-green-600">Running</span></p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry Authentication
          </button>
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
