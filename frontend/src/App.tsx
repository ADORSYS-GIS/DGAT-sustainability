import React, { useEffect, useState } from "react";
import AppRouter from "./router/AppRouter";
import { initKeycloak } from "./services/shared/authService";
import { useAuth } from "./hooks/shared/useAuth";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";

const App = () => {
  const [loading, setLoading] = useState(true);
  const { loadUser } = useAuth();

  useEffect(() => {
    const initialize = async () => {
      try {
        const authenticated = await initKeycloak();
        if (authenticated) {
          await loadUser();
        }
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadUser]);

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
