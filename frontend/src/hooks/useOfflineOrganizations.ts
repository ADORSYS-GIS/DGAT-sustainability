import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineOrganization, SyncQueueItem } from "@/types/offline";
import type { OrganizationCreateRequest, OrganizationResponse } from "@/openapi-rq/requests/types.gen";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

import { OrganizationsService } from "@/openapi-rq/requests/services.gen";
import type { Organization } from "@/openapi-rq/requests/types.gen";
import { DataTransformationService } from "@/services/dataTransformation";

export const useOfflineOrganizations = () => {
  const [organizations, setOrganizations] = useState<OfflineOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedOrgs = await offlineDB.getAllOrganizations();
      setOrganizations(storedOrgs);
    } catch (error) {
      console.error("Failed to fetch organizations from IndexedDB:", error);
      toast.error("Failed to load organizations offline.");
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.entityType === 'organization') {
        fetchOrganizations(); // Refetch organizations after sync
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener('datasync', handleDataSync);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener('datasync', handleDataSync);
    };
  }, [fetchOrganizations]);

  const createOrganizationOffline = useCallback(async (requestBody: OrganizationCreateRequest) => {
    const tempId = uuidv4();
    const now = new Date().toISOString();

    // Optimistic offline object (used if offline or if online fails initially)
    const newOrgOffline: OfflineOrganization = {
      organization_id: tempId,
      id: tempId,
      name: requestBody.name,
      domains: requestBody.domains.map(d => d.name),
      redirectUrl: requestBody.redirectUrl,
      attributes: requestBody.attributes,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      local_changes: true,
    };

    try {
      const result = await OrganizationsService.postAdminOrganizations({ requestBody });
      if (result && result.id) {
        // Success! Transform and save the REAL organization
        const realOrg = DataTransformationService.transformOrganization(result as Organization);
        await offlineDB.saveOrganization(realOrg);

        setOrganizations((prev) => [...prev, realOrg]);
        toast.success("Organization created successfully.");

        // Notify other components
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));

        return realOrg;
      }

      throw new Error("API did not return a valid organization ID on creation.");
    } catch (error) {
      // Only fall back to offline create when the browser is actually offline.
      if (navigator.onLine) {
        console.error("Online creation failed:", error);
        toast.error("Failed to create organization.");
        throw error;
      }
    }

    try {
      await offlineDB.saveOrganization(newOrgOffline);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: tempId,
        operation: "create",
        data: requestBody,
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) => [...prev, newOrgOffline]);
      toast.success("Organization created offline. Syncing soon.");
      return newOrgOffline;
    } catch (error) {
      console.error("Failed to create organization offline:", error);
      toast.error("Failed to create organization.");
      throw error;
    }
  }, []);

  const updateOrganizationOffline = useCallback(async (id: string, requestBody: OrganizationCreateRequest) => {
    const now = new Date().toISOString();
    const existingOrg = organizations.find(org => org.organization_id === id);

    if (!existingOrg) {
      toast.error("Organization not found for update.");
      throw new Error("Organization not found for update.");
    }

    const updatedOrgOffline: OfflineOrganization = {
      ...existingOrg,
      name: requestBody.name,
      domains: requestBody.domains.map(d => d.name),
      redirectUrl: requestBody.redirectUrl,
      attributes: requestBody.attributes,
      updated_at: now,
      sync_status: 'pending',
      local_changes: true,
    };

    if (navigator.onLine && !id.startsWith('temp_') && !existingOrg.local_changes) {
      try {
        await OrganizationsService.putAdminOrganizationsById({
          id: id,
          requestBody: requestBody
        });

        // Update local DB with the new values but marked as synced
        const updatedOrgSynced: OfflineOrganization = {
          ...updatedOrgOffline,
          sync_status: 'synced',
          local_changes: false
        };

        await offlineDB.saveOrganization(updatedOrgSynced);
        setOrganizations((prev) =>
          prev.map((org) => (org.organization_id === id ? updatedOrgSynced : org))
        );

        toast.success("Organization updated successfully.");
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));
        return updatedOrgSynced;
      } catch (error) {
        console.error("Online update failed, falling back to offline queue:", error);
      }
    }

    try {
      await offlineDB.saveOrganization(updatedOrgOffline);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: id,
        operation: "update",
        data: requestBody,
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) =>
        prev.map((org) => (org.organization_id === id ? updatedOrgOffline : org))
      );
      toast.success("Organization updated offline. Syncing soon.");
      return updatedOrgOffline;
    } catch (error) {
      console.error("Failed to update organization offline:", error);
      toast.error("Failed to update organization.");
      throw error;
    }
  }, [organizations]);

  const deleteOrganizationOffline = useCallback(async (id: string) => {
    const now = new Date().toISOString();

    if (navigator.onLine && !id.startsWith('temp_')) {
      try {
        await OrganizationsService.deleteAdminOrganizationsById({ id });
        await offlineDB.deleteOrganization(id);
        setOrganizations((prev) => prev.filter((org) => org.organization_id !== id));
        toast.success("Organization deleted successfully.");
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));
        return;
      } catch (error) {
        console.error("Online delete failed, falling back to offline queue:", error);
      }
    }

    try {
      await offlineDB.deleteOrganization(id);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: id,
        operation: "delete",
        data: { id },
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) => prev.filter((org) => org.organization_id !== id));
      toast.success("Organization deleted offline. Syncing soon.");
    } catch (error) {
      console.error("Failed to delete organization offline:", error);
      toast.error("Failed to delete organization.");
      throw error;
    }
  }, []);

  return {
    organizations,
    isLoading,
    isOnline,
    createOrganizationOffline,
    updateOrganizationOffline,
    deleteOrganizationOffline,
    refetchOrganizations: fetchOrganizations,
  };
};