import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./shared/useAuth";
import { useSyncStatus } from "./shared/useSyncStatus";
import { InitialDataLoader, type UserContext } from "@/services/initialDataLoader";
import { offlineDB } from "@/services/indexeddb";
import { toast } from "sonner";
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
    try {
      const loader = new InitialDataLoader();
      return await loader.isDataLoadingRequired(userContext);
    } catch (error) {
      console.warn('Failed to check if data loading is required:', error);
      return true; // Default to loading if check fails
    }
  }, []);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    console.log('🔍 loadInitialData called');
    console.log('🔍 isAuthenticated:', isAuthenticated);
    console.log('🔍 user:', user);
    console.log('🔍 isOnline:', isOnline);
    
    if (!isAuthenticated || !user) {
      console.log('❌ User not authenticated, skipping data loading');
      return;
    }

    const userContext = createUserContext();
    if (!userContext) {
      console.log('❌ Could not create user context, skipping data loading');
      return;
    }

    console.log('🔍 useInitialDataLoad: User context created:', userContext);
    console.log('🔍 useInitialDataLoad: User roles:', userContext.roles);
    console.log('🔍 useInitialDataLoad: Organization ID:', userContext.organizationId);

    // Check if we need to load data
    console.log('🔍 Checking if data loading is required...');
    const needsLoading = await checkDataLoadingRequired(userContext);
    console.log('🔍 useInitialDataLoad: Data loading required:', needsLoading);
    console.log('🔍 useInitialDataLoad: hasLoadedData:', hasLoadedData);
    
    // Both org_admin and org_user load the same data - no differentiation
    // Always load if needed, regardless of hasLoadedData state
    if (!needsLoading) {
      console.log('🔍 Data loading not required, skipping');
      return;
    }

    // Only load data if online
    if (!isOnline) {
      console.log('❌ Offline mode, skipping initial data load');
      toast.info("You are offline. Using local data.");
      return;
    }

    console.log('🔍 useInitialDataLoad: Starting data loading...');
    setIsLoading(true);
    const loader = new InitialDataLoader();

    try {
      console.log('🚀 Starting initial data loading for user:', userContext.userId);
      toast.info("Loading your data for offline access...");

      // Start loading
      await loader.loadAllData(userContext);

      // Get final progress
      const finalProgress = await loader.getProgress();
      setProgress(finalProgress);

      if (finalProgress?.status === 'completed') {
        setHasLoadedData(true);
        toast.success("Data loaded successfully! You can now work offline.");
        console.log('✅ Initial data loading completed successfully');
      } else if (finalProgress?.status === 'failed') {
        throw new Error(finalProgress.error_message || 'Data loading failed');
      }

    } catch (error) {
      console.error('❌ Initial data loading failed:', error);
      toast.error("Failed to load data. Some features may not work offline.");
      
      // Update progress to failed state
      const failedProgress = await loader.getProgress();
      setProgress(failedProgress);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, createUserContext, checkDataLoadingRequired, isOnline, hasLoadedData]);

  // Monitor progress updates
  const monitorProgress = useCallback(async () => {
    if (!isLoading) return;

    const loader = new InitialDataLoader();
    const currentProgress = await loader.getProgress();
    
    if (currentProgress && currentProgress.status === 'loading') {
      setProgress(currentProgress);
      
      // Show progress toast for long operations
      if (currentProgress.total_items > 0) {
        const percentage = Math.round((currentProgress.loaded_items / currentProgress.total_items) * 100);
        if (percentage % 25 === 0 && percentage > 0) { // Show every 25%
          toast.info(`${currentProgress.current_entity} (${percentage}%)`);
        }
      }
    }
  }, [isLoading]);

  // Effect to load data when user authenticates
  useEffect(() => {
    console.log('🔍 useEffect triggered for data loading');
    console.log('🔍 isAuthenticated:', isAuthenticated);
    console.log('🔍 user exists:', !!user);
    console.log('🔍 isOnline:', isOnline);
    
    if (isAuthenticated && user && isOnline) {
      console.log('🔍 All conditions met, calling loadInitialData');
      loadInitialData();
    } else {
      console.log('🔍 Conditions not met, skipping loadInitialData');
    }
  }, [isAuthenticated, user, isOnline, loadInitialData]);

  // Effect to monitor progress
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(monitorProgress, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [isLoading, monitorProgress]);

  // Effect to handle online/offline transitions
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isOnline && !hasLoadedData) {
        // User came back online and hasn't loaded data yet
        loadInitialData();
      } else if (!isOnline) {
        // User went offline
        toast.info("You are offline. Using local data.");
      }
    }
  }, [isOnline, isAuthenticated, user, hasLoadedData, loadInitialData]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      toast.error("You must be logged in to refresh data");
      return;
    }

    if (!isOnline) {
      toast.error("You must be online to refresh data");
      return;
    }

    const userContext = createUserContext();
    if (!userContext) {
      toast.error("Could not determine user context");
      return;
    }

    setIsLoading(true);
    const loader = new InitialDataLoader();

    try {
      toast.info("Refreshing your data...");
      
      // Clear existing data and reload
      await loader.clearAllData();
      await loader.loadAllData(userContext);

      const finalProgress = await loader.getProgress();
      setProgress(finalProgress);

      if (finalProgress?.status === 'completed') {
        setHasLoadedData(true);
        toast.success("Data refreshed successfully!");
      } else {
        throw new Error(finalProgress?.error_message || 'Data refresh failed');
      }

    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error("Failed to refresh data");
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