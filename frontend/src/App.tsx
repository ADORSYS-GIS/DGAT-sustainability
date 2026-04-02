import React, { useEffect } from "react";
import AppRouter from "./router/AppRouter";
import { useInitialDataLoad } from "./hooks/useInitialDataLoad";
import { useAuth } from "./hooks/shared/useAuth";

const App = () => {
  // The useAuth hook is kept to ensure authentication state is managed
  // but the loading state is not used to block the UI.
  const { isAuthenticated, loading } = useAuth();

  // The useInitialDataLoad hook is kept to trigger data loading in the background.
  useInitialDataLoad();

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let cancelled = false;

    const schedule = (fn: () => void) => {
      const requestIdleCallback = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout?: number }) => void);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(fn, { timeout: 1500 });
      } else {
        window.setTimeout(fn, 0);
      }
    };

    schedule(async () => {
      if (cancelled) return;
      const { syncService } = await import("@/services/syncService");
      if (cancelled) return;
      try {
        await syncService.performFullSync();
      } catch {
        // Sync errors are handled internally and surfaced via UI/toasts elsewhere
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading]);

  // AppRouter will now be rendered immediately.
  // It should have its own logic to handle routes based on authentication status.
  return <AppRouter />;
};

export default App;
