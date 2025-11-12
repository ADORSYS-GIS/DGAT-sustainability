import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  OrganizationMembersService,
} from "@/openapi-rq/requests/services.gen";
import type { 
  OrganizationMember,
} from "@/openapi-rq/requests/types.gen";

export function useOfflineUsers(organizationId?: string) {
  const [data, setData] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the org-admin specific endpoint for fetching users
      const result = await apiInterceptor.interceptGet(
        () => OrganizationMembersService.getOrganizationsByIdOrgAdminMembers({ id: organizationId }).then(response => ({ members: response })),
        () => offlineDB.getUsersByOrganization(organizationId).then(users => ({ members: users })),
        'users',
        organizationId
      );

      // Filter out temporary users (those with IDs starting with "temp_")
      const resultData = result as { members: OrganizationMember[] } | OrganizationMember[];
      const filteredResult = Array.isArray(resultData) ? resultData : resultData.members || [];
      const filteredUsers = filteredResult.filter((user: OrganizationMember) => !user.id?.startsWith('temp_'));
      
      setData(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}