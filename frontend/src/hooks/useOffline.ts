import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
import { offlineDB } from "@/services/indexeddb";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export function useOfflineQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
) {
  const { isOnline } = useSyncStatus();

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await queryFn();
          // This is a simplified caching strategy. You might need to make it more robust.
          if (Array.isArray(data) && queryKey.includes("questions")) {
            await offlineDB.saveQuestions(data);
          }
          return data;
        } catch (error) {
          toast.error("Network request failed. Loading from cache.");
          // This is a simplified cache-loading strategy.
          if (queryKey.includes("questions")) {
            return offlineDB.getAllQuestions() as Promise<TData>;
          }
          throw new Error("No offline data available for this query.");
        }
      } else {
        if (queryKey.includes("questions")) {
          return offlineDB.getAllQuestions() as Promise<TData>;
        }
        toast.info("You are offline. Showing cached data.");
        throw new Error("No offline data available for this query.");
      }
    },
  });
}

export function useOfflineMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
) {
  const { isOnline } = useSyncStatus();
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      if (isOnline) {
        try {
          const data = await mutationFn(variables);
          toast.success("Changes saved successfully!");
          return data;
        } catch (error) {
          toast.error("Request failed. Saving data locally for sync.");
          await offlineDB.addToSyncQueue({
            id: uuidv4(),
            entity_type: "user", // Default type, should be more specific
            operation: "create",
            data: { variables },
            retry_count: 0,
            max_retries: 3,
            priority: "normal",
            created_at: new Date().toISOString(),
          });
          throw error;
        }
      } else {
        toast.info("You are offline. Queuing changes for later sync.");
        await offlineDB.addToSyncQueue({
          id: uuidv4(),
          entity_type: "user", // Default type, should be more specific
          operation: "create",
          data: { variables },
          retry_count: 0,
          max_retries: 3,
          priority: "normal",
          created_at: new Date().toISOString(),
        });
        throw new Error("Offline. Changes queued.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
