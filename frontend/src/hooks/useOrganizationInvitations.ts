import { useState, useEffect, useCallback } from "react";
import { OrganizationInvitationsService } from "@/openapi-rq/requests/services.gen";
import type { OrganizationInvitation } from "@/openapi-rq/requests/types.gen";

export function useOrganizationInvitations(organizationId?: string) {
  const [data, setData] = useState<OrganizationInvitation[]>([]);
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
      const result = await OrganizationInvitationsService.getApiOrganizationsByIdInvitations({
        id: organizationId,
      });
      // Filter to only show pending invitations
      const pending = result.filter(
        (inv) => inv.status === "pending"
      );
      setData(pending);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch invitations"));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}