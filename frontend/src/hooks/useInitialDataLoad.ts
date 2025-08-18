/*
 * Hook for initial data loading and synchronization
 * Handles startup data fetching, offline sync, and initial app state
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./shared/useAuth";
import { useSyncStatus } from "./shared/useSyncStatus";
import {
  InitialDataLoader,
  type UserContext,
} from "@/services/initialDataLoader";
import { offlineDB } from "@/services/indexeddb";
import type { DataLoadingProgress } from "@/types/offline";

export function useInitialDataLoad() {
  const { isAuthenticated, user, roles } = useAuth();
  const { isOnline } = useSyncStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<DataLoadingProgress | undefined>();
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Create user context from auth data
  const createUserContext = useCallback((): UserContext | null => {
    if (!user || !isAuthenticated) return null;

    // Extract organization information from user object
    let organizationId: string | undefined;
    let organizationName: string | undefined;

    if (user.organizations && typeof user.organizations === "object") {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgName = orgKeys[0];
        const orgData = (
          user.organizations as Record<
            string,
            { id: string; categories: string[] }
          >
        )[orgName];
        organizationId = orgData?.id;
        organizationName = orgName;
      }
    }

    return {
      userId: user.sub || "",
      userEmail: user.email,
      roles: roles,
      organizationId,
      organizationName,
    };
  }, [user, isAuthenticated, roles]);

  // Check if data loading is required
  const checkDataLoadingRequired = useCallback(
    async (userContext?: UserContext): Promise<boolean> => {
      // Don't check if not authenticated
      if (!isAuthenticated || !user) {
        return false;
      }

      try {
        const loader = new InitialDataLoader();
        return await loader.isDataLoadingRequired(userContext);
      } catch (error) {
        console.warn("Failed to check if data loading is required:", error);
        return true; // Default to loading if check fails
      }
    },
    [isAuthenticated, user],
  );

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    const userContext = createUserContext();
    if (!userContext) {
      return;
    }

    // Check if we need to load data
    const needsLoading = await checkDataLoadingRequired(userContext);

    // Both org_admin and Org_User load the same data - no differentiation
    // Always load if needed, regardless of hasLoadedData state
    if (!needsLoading) {
      return;
    }

    // Only load data if online
    if (!isOnline) {
      return;
    }

    setIsLoading(true);
    const loader = new InitialDataLoader();

    try {
      // Start loading
      await loader.loadAllData(userContext);

      // Get final progress
      const finalProgress = await loader.getProgress();
      setProgress(finalProgress);

      if (finalProgress?.status === "completed") {
        setHasLoadedData(true);
      } else if (finalProgress?.status === "failed") {
        throw new Error(finalProgress.error_message || "Data loading failed");
      }
    } catch (error) {
      console.error("Initial data loading failed:", error);

      // Update progress to failed state
      const failedProgress = await loader.getProgress();
      setProgress(failedProgress);
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    user,
    createUserContext,
    checkDataLoadingRequired,
    isOnline,
    // hasLoadedData intentionally omitted to avoid unnecessary reloads
  ]);

  // Monitor progress updates
  const monitorProgress = useCallback(async () => {
    if (!isLoading || !isAuthenticated) return;

    const loader = new InitialDataLoader();
    const currentProgress = await loader.getProgress();

    if (currentProgress && currentProgress.status === "loading") {
      setProgress(currentProgress);
    }
  }, [isLoading, isAuthenticated]);

  // Effect to load data when user authenticates
  useEffect(() => {
    if (isAuthenticated && user && isOnline) {
      loadInitialData();
    }
  }, [isAuthenticated, user, isOnline, loadInitialData]);

  // Effect to monitor progress
  useEffect(() => {
    if (isLoading && isAuthenticated) {
      const interval = setInterval(monitorProgress, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [isLoading, monitorProgress, isAuthenticated]);

  // Effect to handle online/offline transitions
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isOnline && !hasLoadedData) {
        // User came back online and hasn't loaded data yet
        loadInitialData();
      }
    }
  }, [isOnline, isAuthenticated, user, hasLoadedData, loadInitialData]);

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

      if (finalProgress?.status === "completed") {
        setHasLoadedData(true);
      } else {
        throw new Error(finalProgress?.error_message || "Data refresh failed");
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isOnline, createUserContext]);

  // Get loading status
  const getLoadingStatus = useCallback(() => {
    if (!isAuthenticated) return "not_authenticated";
    if (!isOnline) return "offline";
    if (isLoading) return "loading";
    if (hasLoadedData) return "loaded";
    return "not_loaded";
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
