// Enhanced Offline API Hooks
// Provides transparent offline-first behavior using the API interceptor
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { QueryClient } from "@tanstack/react-query";

// Utility function to invalidate and refetch queries
export const invalidateAndRefetch = async (queryClient: QueryClient, queryKeys: string[]) => {
  try {
    // Invalidate all specified query keys
    await Promise.all(
      queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
    );
    
    // Refetch all specified query keys
    await Promise.all(
      queryKeys.map(key => queryClient.refetchQueries({ queryKey: [key] }))
    );
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
};