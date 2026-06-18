import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/services/shared/authService";

export interface PendingInvitation {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  invitation_status: string;
  roles: string;
  org_id: string;
}

export function useOrganizationInvitations(organizationId?: string) {
  const [data, setData] = useState<PendingInvitation[]>([]);
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
      const response = await fetchWithAuth(
        `/api/admin/organizations/${organizationId}/pending-invitations`
      );
      if (!response.ok) throw new Error("Failed to fetch pending invitations");
      const result: PendingInvitation[] = await response.json();
      setData(result);
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

export function useResendOrgInvitation(orgId?: string) {
  const [isPending, setIsPending] = useState(false);

  const resendInvitation = useCallback(
    async (userId: string) => {
      if (!orgId) return;
      setIsPending(true);
      try {
        const response = await fetchWithAuth(
          `/api/admin/organizations/${orgId}/users/${userId}/resend-invitation`,
          { method: "POST" }
        );
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message || "Failed to resend invitation"
          );
        }
        return await response.json();
      } finally {
        setIsPending(false);
      }
    },
    [orgId]
  );

  return { resendInvitation, isPending };
}

export function useDeleteOrgUser(orgId?: string) {
  const [isPending, setIsPending] = useState(false);

  const deleteUser = useCallback(
    async (userId: string) => {
      if (!orgId) return;
      setIsPending(true);
      try {
        const response = await fetchWithAuth(
          `/api/organizations/${orgId}/users/${userId}`,
          { method: "DELETE" }
        );
        if (!response.ok && response.status !== 204) {
          throw new Error("Failed to delete user");
        }
      } finally {
        setIsPending(false);
      }
    },
    [orgId]
  );

  return { deleteUser, isPending };
}