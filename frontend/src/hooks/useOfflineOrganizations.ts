import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineOrganization, SyncQueueItem } from "@/types/offline";
import type { OrganizationCreateRequest, OrganizationResponse } from "@/openapi-rq/requests/types.gen";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { OrganizationsService } from "@/openapi-rq/requests/services.gen";
import type { Organization } from "@/openapi-rq/requests/types.gen";
import { DataTransformationService } from "@/services/dataTransformation";

// Reserved characters that cannot be used in organization names (Keycloak alias restriction)
const RESERVED_CHARS = /[<>/\\:;"'*?|&%$#@!(){}[\]^~`+=, ]/;

/**
 * Extract error message from API error response
 */
const extractErrorMessage = (error: unknown): string => {
  const tryParseJsonString = (value: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  const extractFromRecord = (record: Record<string, unknown>): string | null => {
    // Check for common error message fields in order of priority
    const candidates = [
      record.errorMessage,
      record.message,
      record.error,
      record.detail,
      record.title,
    ];

    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c;
    }

    return null;
  };

  if (typeof error === 'string') {
    const parsed = tryParseJsonString(error);
    if (parsed) {
      const msg = extractFromRecord(parsed);
      if (msg) return msg;
    }
    return error;
  }

  if (error && typeof error === "object") {
    const asRecord = error as Record<string, unknown>;
    
    // Debug log to see what error structure we're getting
    console.log('Error object structure:', {
      keys: Object.keys(asRecord),
      body: asRecord.body,
      message: asRecord.message,
      error: asRecord.error
    });

    // Check if it's an ApiError instance with body property
    const body = asRecord.body;
    if (body && typeof body === 'object') {
      const bodyMsg = extractFromRecord(body as Record<string, unknown>);
      if (bodyMsg) {
        console.log('Extracted message from error.body:', bodyMsg);
        return bodyMsg;
      }
    }
    if (typeof body === 'string') {
      const parsed = tryParseJsonString(body);
      if (parsed) {
        const msg = extractFromRecord(parsed);
        if (msg) return msg;
      }
      if (body.trim()) return body;
    }

    const topLevel = extractFromRecord(asRecord);
    if (topLevel) {
      console.log('Extracted message from top-level:', topLevel);
      return topLevel;
    }

    // OpenAPI/axios-like: error.response.data
    const response = asRecord.response;
    if (response && typeof response === 'object') {
      const responseRecord = response as Record<string, unknown>;
      const data = responseRecord.data;
      if (data && typeof data === 'object') {
        const dataMsg = extractFromRecord(data as Record<string, unknown>);
        if (dataMsg) return dataMsg;
      }
      if (typeof data === 'string') {
        const parsed = tryParseJsonString(data);
        if (parsed) {
          const msg = extractFromRecord(parsed);
          if (msg) return msg;
        }
      }
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

/**
 * Validate organization name for reserved characters
 */
const validateOrganizationName = (name: string, t: (key: string, options?: Record<string, unknown>) => string): string | null => {
  if (RESERVED_CHARS.test(name)) {
    return t('manageOrganizations.nameReservedChars');
  }
  return null;
};

export const useOfflineOrganizations = () => {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<OfflineOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        try {
          const organizationsData = await OrganizationsService.getAdminOrganizations();
          const transformedOrganizations = (organizationsData || []).map(
            DataTransformationService.transformOrganization
          );
          await offlineDB.saveOrganizations(transformedOrganizations);
          setOrganizations(transformedOrganizations);
          return;
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          console.error("Failed to fetch organizations from API, falling back to IndexedDB:", error);
          toast.error(errorMessage);
        }
      }

      const storedOrgs = await offlineDB.getAllOrganizations();
      setOrganizations(storedOrgs);
    } catch (error) {
      console.error("Failed to fetch organizations from IndexedDB:", error);
      toast.error(t('offline.failedToLoadOrganizations'));
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
    // Client-side validation for reserved characters
    const nameError = validateOrganizationName(requestBody.name, t);
    if (nameError) {
      toast.error(nameError);
      throw new Error(nameError);
    }

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
        toast.success(t('offline.organizationCreated'));

        // Notify other components
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));

        return realOrg;
      }

      throw new Error("API did not return a valid organization ID on creation.");
    } catch (error) {
      // Only fall back to offline create when the browser is actually offline.
      if (navigator.onLine) {
        const errorMessage = extractErrorMessage(error);
        console.error("Online creation failed:", error);
        toast.error(errorMessage);
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
      toast.success(t('offline.organizationCreatedOffline'));
      return newOrgOffline;
    } catch (error) {
      console.error("Failed to create organization offline:", error);
      toast.error(t('offline.failedToCreateOrganization'));
      throw error;
    }
  }, []);

  const updateOrganizationOffline = useCallback(async (id: string, requestBody: OrganizationCreateRequest) => {
    const now = new Date().toISOString();
    const existingOrg = organizations.find(org => org.organization_id === id);

    if (!existingOrg) {
      toast.error(t('offline.organizationNotFound'));
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

    if (navigator.onLine && !id.startsWith('temp_') && existingOrg.sync_status === 'synced') {
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

        toast.success(t('offline.organizationUpdated'));
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));
        return updatedOrgSynced;
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        console.error("Online update failed:", error);
        toast.error(errorMessage);
        throw error;
      }
    }

    if (navigator.onLine) {
      const message = "Organization is not synced yet. Please wait for sync to complete before updating.";
      toast.error(message);
      throw new Error(message);
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
      toast.success(t('offline.organizationUpdatedOffline'));
      return updatedOrgOffline;
    } catch (error) {
      console.error("Failed to update organization offline:", error);
      toast.error(t('offline.failedToUpdateOrganization'));
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
        toast.success(t('offline.organizationDeleted'));
        window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'organization' } }));
        return;
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        console.error("Online delete failed:", error);
        toast.error(errorMessage);
        throw error;
      }
    }

    if (navigator.onLine) {
      const message = "Cannot delete a local-only organization while online. Please wait for sync to complete.";
      toast.error(message);
      throw new Error(message);
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
      toast.success(t('offline.organizationDeletedOffline'));
    } catch (error) {
      console.error("Failed to delete organization offline:", error);
      toast.error(t('offline.failedToDeleteOrganization'));
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