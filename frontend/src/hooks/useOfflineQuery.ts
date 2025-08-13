import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { offlineDB } from "../services/indexeddb";

interface OfflineQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  localDataFn: () => Promise<T | null>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface OfflineMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  localMutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void;
}

// Custom hook for offline-first queries
export function useOfflineQuery<T>(options: OfflineQueryOptions<T>) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Main query with offline-first strategy
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      try {
        // Try local data first
        const localData = await options.localDataFn();

        if (localData && !isOnline) {
          // Return local data if offline
          return localData;
        }

        if (isOnline) {
          try {
            // Try network data if online
            const networkData = await options.queryFn();
            return networkData;
          } catch (networkError) {
            // Fallback to local data if network fails
            if (localData) {
              console.warn("Network failed, using local data:", networkError);
              return localData;
            }
            throw networkError;
          }
        }

        // Return local data if available
        if (localData) {
          return localData;
        }

        throw new Error("No data available offline");
      } catch (error) {
        console.error("Query failed:", error);
        throw error;
      }
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? (isOnline ? 5 * 60 * 1000 : Infinity), // 5 minutes online, never stale offline
    gcTime: options.cacheTime ?? 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? isOnline,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
  });

  return {
    ...query,
    isOnline,
  };
}

// Custom hook for offline-first mutations
export function useOfflineMutation<TData, TVariables>(
  options: OfflineMutationOptions<TData, TVariables>,
) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        if (isOnline) {
          // Try network mutation first if online
          try {
            const result = await options.mutationFn(variables);
            return result;
          } catch (networkError) {
            console.warn(
              "Network mutation failed, using local mutation:",
              networkError,
            );
            // Fallback to local mutation
            const result = await options.localMutationFn(variables);
            return result;
          }
        } else {
          // Use local mutation if offline
          const result = await options.localMutationFn(variables);
          return result;
        }
      } catch (error) {
        console.error("Mutation failed:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error as Error, variables);
    },
    onSettled: (data, error, variables) => {
      options.onSettled?.(data, error, variables);
    },
  });

  return {
    ...mutation,
    isOnline,
  };
}
