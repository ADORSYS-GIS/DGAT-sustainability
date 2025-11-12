import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineOrganizationCategory } from "@/types/offline";
import { getAuthState } from "@/services/shared/authService";
import { toast } from "sonner";

export const useOfflineOrganizationCategories = () => {
  const [organizationCategories, setOrganizationCategories] = useState<OfflineOrganizationCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authState = getAuthState();
  const organizationId = authState.organizationId;

  const fetchOrganizationCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!organizationId) {
      setError("User is not associated with an organization.");
      setIsLoading(false);
      return;
    }
    try {
      const allOrgCategories = await offlineDB.getAllOrganizationCategories();
      const filteredCategories = allOrgCategories.filter(
        (oc) => oc.organization_id === organizationId
      );
      setOrganizationCategories(filteredCategories);
    } catch (err) {
      console.error("Failed to fetch organization categories from IndexedDB:", err);
      setError("Failed to load organization categories offline.");
      toast.error("Failed to load organization categories offline.");
      setOrganizationCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOrganizationCategories();

    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.entityType === 'organization_categories') {
        fetchOrganizationCategories(); // Refetch organization categories after sync
      }
    };

    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [fetchOrganizationCategories]);

  return {
    organizationCategories,
    isLoading,
    error,
    refetchOrganizationCategories: fetchOrganizationCategories,
  };
};