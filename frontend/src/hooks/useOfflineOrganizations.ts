import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineOrganization, SyncQueueItem } from "@/types/offline";
import type { OrganizationCreateRequest, OrganizationResponse } from "@/openapi-rq/requests/types.gen";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

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

    const newOrg: OfflineOrganization = {
      organization_id: tempId, // Use tempId for IndexedDB key
      id: tempId, // Also set the API 'id' field for consistency
      name: requestBody.name,
      domains: requestBody.domains.map(d => d.name), // Correctly map to string[]
      redirectUrl: requestBody.redirectUrl,
      attributes: requestBody.attributes,
      // enabled is not part of OfflineOrganization, it's handled in attributes if needed
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
      local_changes: true,
    };

    try {
      await offlineDB.saveOrganization(newOrg);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: tempId,
        operation: "create",
        data: requestBody, // Send original request body for creation
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) => [...prev, newOrg]);
      toast.success("Organization created offline. Syncing soon.");
      return newOrg;
    } catch (error) {
      console.error("Failed to create organization offline:", error);
      toast.error("Failed to create organization offline.");
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

    const updatedOrg: OfflineOrganization = {
      ...existingOrg,
      name: requestBody.name,
      domains: requestBody.domains.map(d => d.name), // Correctly map to string[]
      redirectUrl: requestBody.redirectUrl,
      attributes: requestBody.attributes,
      // enabled is not part of OfflineOrganization, it's handled in attributes if needed
      updated_at: now,
      sync_status: 'pending',
      local_changes: true,
    };

    try {
      await offlineDB.saveOrganization(updatedOrg);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: id,
        operation: "update",
        data: requestBody, // Send original request body for update
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) =>
        prev.map((org) => (org.organization_id === id ? updatedOrg : org))
      );
      toast.success("Organization updated offline. Syncing soon.");
      return updatedOrg;
    } catch (error) {
      console.error("Failed to update organization offline:", error);
      toast.error("Failed to update organization offline.");
      throw error;
    }
  }, [organizations]);

  const deleteOrganizationOffline = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    try {
      await offlineDB.deleteOrganization(id);
      await offlineDB.addToSyncQueue({
        id: uuidv4(),
        entity_type: "organization",
        entity_id: id,
        operation: "delete",
        data: { id }, // Only need the ID for deletion
        retry_count: 0,
        max_retries: 3,
        priority: "normal",
        created_at: now,
      });
      setOrganizations((prev) => prev.filter((org) => org.organization_id !== id));
      toast.success("Organization deleted offline. Syncing soon.");
    } catch (error) {
      console.error("Failed to delete organization offline:", error);
      toast.error("Failed to delete organization offline.");
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