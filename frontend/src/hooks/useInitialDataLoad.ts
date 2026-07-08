import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./shared/useAuth";
import { useSyncStatus } from "./shared/useSyncStatus";
import { InitialDataLoader, type UserContext } from "@/services/initialDataLoader";
import { offlineDB } from "@/services/indexeddb";
import type { DataLoadingProgress } from "@/types/offline";

let globalLoadPromise: Promise<void> | null = null;
let globalLastCheckAt = 0;
let globalHasLoadedData = false;
const globalCheckCooldownMs = 60_000;

export function useInitialDataLoad() {
  const { isAuthenticated, user, roles } = useAuth();
  const { isOnline } = useSyncStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<DataLoadingProgress | undefined>();
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const wasOnlineRef = useRef(isOnline);
  const userKeyRef = useRef<string>("");

  // Create user context from auth data
  const createUserContext = useCallback((): UserContext | null => {
    if (!user || !isAuthenticated) return null;

    // Extract organization information from user object
    let organizationId: string | undefined;
    let organizationName: string | undefined;

    if (user.organizations && typeof user.organizations === 'object') {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgName = orgKeys[0];
        const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgName];
        organizationId = orgData?.id;
        organizationName = orgName;
      }
    }

    return {
      userId: user.sub || '',
      userEmail: user.email,
      roles: roles,
      organizationId,
      organizationName,
    };
  }, [user, isAuthenticated, roles]);

  // Check if data loading is required
  const checkDataLoadingRequired = useCallback(async (userContext?: UserContext): Promise<boolean> => {
    // Don't check if not authenticated
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const loader = new InitialDataLoader();
      return await loader.isDataLoadingRequired(userContext);
    } catch (error) {
      console.warn('Failed to check if data loading is required:', error);
      return true; // Default to loading if check fails
    }
  }, [isAuthenticated, user]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    // If another instance already completed loading, reflect that immediately.
    if (globalHasLoadedData) {
      setHasLoadedData(true);
      return;
    }

    const userContext = createUserContext();
    if (!userContext) {
      return;
    }

    // If IndexedDB already indicates a completed load, don't trigger the heavy loader.
    try {
      const existingProgress = await offlineDB.getLoadingProgress();
      if (existingProgress?.status === 'completed') {
        setProgress(existingProgress);
        setHasLoadedData(true);
        globalHasLoadedData = true;
        return;
      }
    } catch {
      // Ignore and proceed with checks
    }

    // Avoid repeatedly doing the expensive "needsLoading" check on every navigation.
    if (Date.now() - globalLastCheckAt < globalCheckCooldownMs) {
      // If we recently checked and didn't load, just exit silently.
      return;
    }
    globalLastCheckAt = Date.now();

    // Check if we need to load data
    const needsLoading = await checkDataLoadingRequired(userContext);

    // Both org_admin and Org_User load the same data - no differentiation
    // Always load if needed, regardless of hasLoadedData state
    if (!needsLoading) {
      setHasLoadedData(true);
      globalHasLoadedData = true;
      return;
    }

    // Only load data if online
    if (!isOnline) {
      return;
    }

    // Singleton: prevent multiple concurrent full loads across pages/components.
    if (globalLoadPromise) {
      setIsLoading(true);
      try {
        await globalLoadPromise;
      } finally {
        setIsLoading(false);
      }
      if (globalHasLoadedData) {
        setHasLoadedData(true);
      }
      return;
    }

    // Set loading state to prevent concurrent loads
    setIsLoading(true);
    const loader = new InitialDataLoader();

    globalLoadPromise = (async () => {
      // Start loading
      await loader.loadAllData(userContext);
    })();

    try {
      await globalLoadPromise;

      // Get final progress
      const finalProgress = await loader.getProgress();
      setProgress(finalProgress);

      if (finalProgress?.status === 'completed') {
        setHasLoadedData(true);
        globalHasLoadedData = true;
      } else if (finalProgress?.status === 'failed') {
        throw new Error(finalProgress.error_message || 'Data loading failed');
      }
    } catch (error) {
      console.error('Initial data loading failed:', error);

      // Update progress to failed state
      const failedProgress = await loader.getProgress();
      setProgress(failedProgress);
    } finally {
      globalLoadPromise = null;
      setIsLoading(false);
    }
  }, [isAuthenticated, user, createUserContext, checkDataLoadingRequired, isOnline]);

  // Monitor progress updates
  const monitorProgress = useCallback(async () => {
    if (!isLoading || !isAuthenticated) return;

    const loader = new InitialDataLoader();
    const currentProgress = await loader.getProgress();

    if (currentProgress && currentProgress.status === 'loading') {
      setProgress(currentProgress);
    }
  }, [isLoading, isAuthenticated]);

  // Effect to load data when user authenticates
  useEffect(() => {
    if (isLoading || hasLoadedData) return;

    // Fast path: if a previous session completed the load, mark loaded immediately.
    const currentUserKey = user?.sub || '';
    if (userKeyRef.current !== currentUserKey) {
      userKeyRef.current = currentUserKey;
      globalHasLoadedData = false;
      globalLastCheckAt = 0;
    }

    offlineDB.getLoadingProgress().then((p) => {
      if (p?.status === 'completed') {
        setProgress(p);
        setHasLoadedData(true);
        globalHasLoadedData = true;
      }
    }).catch(() => undefined);

    // When offline, skip the expensive data loading check entirely.
    // IndexedDB data is already available; the loading UI is unnecessary.
    if (!isOnline) return;

    const requestIdleCallback = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: { timeout?: number }) => void);
    const schedule = (fn: () => void) => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(fn, { timeout: 5000 });
      } else {
        window.setTimeout(fn, 3000);
      }
    };

    schedule(() => {
      loadInitialData();
    });
  }, [isAuthenticated, user, isOnline, loadInitialData, isLoading, hasLoadedData]);

  // Effect to monitor progress
  useEffect(() => {
    if (isLoading && isAuthenticated) {
      const interval = setInterval(monitorProgress, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [isLoading, monitorProgress, isAuthenticated]);

  // Effect to handle online/offline transitions
  useEffect(() => {
    const cameBackOnline = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current = isOnline;

    if (isAuthenticated && user) {
      if (cameBackOnline && !hasLoadedData) {
        // User came back online and hasn't loaded data yet
        if (!isLoading) {
          loadInitialData();
        }
      }
    }
  }, [isOnline, isAuthenticated, user, hasLoadedData, loadInitialData, isLoading]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (!isOnline) {
      return;
    }

    const userContext = createUserContext();
    if (!userContext) {
      return;
    }

    setIsLoading(true);
    const loader = new InitialDataLoader();

    try {
      // Clear existing data and reload
      await loader.clearAllData();
      await loader.loadAllData(userContext);

      const finalProgress = await loader.getProgress();
      setProgress(finalProgress);

      if (finalProgress?.status === 'completed') {
        setHasLoadedData(true);
      } else {
        throw new Error(finalProgress?.error_message || 'Data refresh failed');
      }

    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isOnline, createUserContext]);

  // Get loading status
  const getLoadingStatus = useCallback(() => {
    if (!isAuthenticated) return 'not_authenticated';
    if (!isOnline) return 'offline';
    if (isLoading) return 'loading';
    if (hasLoadedData) return 'loaded';
    return 'not_loaded';
  }, [isAuthenticated, isOnline, isLoading, hasLoadedData]);

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    if (!progress || progress.total_items === 0) return 0;
    return Math.round((progress.loaded_items / progress.total_items) * 100);
  }, [progress]);

  return {
    isLoading,
    progress,
    hasLoadedData,
    refreshData,
    getLoadingStatus,
    getProgressPercentage,
    isDataLoadingRequired: checkDataLoadingRequired,
  };
} 
