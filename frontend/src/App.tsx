import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import "@/services/syncService";

// Separate component that uses authentication hooks
const AuthenticatedApp = () => {
  const [loading, setLoading] = useState(false);
  useInitialDataLoad(); // Pre-load data for offline use

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Initializing..." />
      </div>
    );
  }

  return <AppRouter />;
};

const App = () => {
  return <AuthenticatedApp />;
};

export default App;
