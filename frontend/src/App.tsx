import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { useAuth } from "./hooks/shared/useAuth";
import "@/services/syncService";

const App = () => {
  // The useAuth hook is kept to ensure authentication state is managed
  // but the loading state is not used to block the UI.
  useAuth();

  // The useInitialDataLoad hook is kept to trigger data loading in the background.
  useInitialDataLoad();

  // AppRouter will now be rendered immediately.
  // It should have its own logic to handle routes based on authentication status.
  return <AppRouter />;
};

export default App;
