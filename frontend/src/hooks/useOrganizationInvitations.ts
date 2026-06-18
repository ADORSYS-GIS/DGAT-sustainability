import { useState, useEffect, useCallback } from "react";
import { apiInterceptor } from "../services/apiInterceptor";
import { offlineDB } from "../services/indexeddb";
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

      const result = await apiInterceptor.interceptGet(
        () => OrganizationInvitationsService.getApiOrganizationsByIdInvitations({ id: organizationId }),
        () => offlineDB.getInvitationsByOrganization(organizationId),
        "invitations",
        organizationId
      );

      setData(result as OrganizationInvitation[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch invitations"));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useInvitationMutations() {
  const deleteInvitation = async (organizationId: string, invitationId: string) => {
    try {
      await OrganizationInvitationsService.deleteApiOrganizationsByIdInvitationsByInvitationId({
        id: organizationId,
        invitationId: invitationId,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete invitation:", error);
      throw error;
    }
  };

  return { deleteInvitation };
}