import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineDB } from "@/services/indexeddb";
import { syncService } from "@/services/syncService";
import { apiInterceptor } from "@/services/apiInterceptor";
import { AssessmentsService } from "@/openapi-rq/requests/services.gen";
import type { OfflineAssessment, SyncQueueItem, OfflineCategoryCatalog } from "@/types/offline";
import type { Assessment } from "@/openapi-rq/requests";

const ASSESSMENTS_QUERY_KEY = "assessments";

// Hook to get all assessments from IndexedDB
export function useAssessments() {
  return useQuery({
    queryKey: [ASSESSMENTS_QUERY_KEY],
    queryFn: async () => {
      const assessments = await offlineDB.getAllAssessments();
      // Sort assessments by creation date, newest first
      return assessments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

// Hook to get a single assessment from IndexedDB
export function useAssessment(assessmentId: string) {
  return useQuery({
    queryKey: [ASSESSMENTS_QUERY_KEY, assessmentId],
    queryFn: () => offlineDB.getAssessment(assessmentId),
    enabled: !!assessmentId,
  });
}

// Type for creating a new assessment, including all required fields for offline creation
export type CreateAssessmentInput = {
  name: string;
  org_id: string;
  language: string;
  categories?: string[];
};

// Hook to create a new assessment (offline-first)
export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAssessmentData: CreateAssessmentInput) => {
      const tempId = `temp-${uuidv4()}`;
      const now = new Date().toISOString();

      // Fetch all category catalogs to map IDs to objects
      const allCategoryCatalogs = await offlineDB.getAllCategoryCatalogs();
      const offlineCategories = (newAssessmentData.categories || [])
        .map(id => allCategoryCatalogs.find(c => c.category_catalog_id === id))
        .filter((c): c is OfflineCategoryCatalog => c !== undefined);

      // Construct the full OfflineAssessment object, ensuring all required fields are present
      const offlineAssessment: OfflineAssessment = {
        assessment_id: tempId,
        name: newAssessmentData.name,
        org_id: newAssessmentData.org_id,
        language: newAssessmentData.language,
        status: 'draft', // Default status for a new assessment
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        organization_id: newAssessmentData.org_id, // Also populate the offline-specific field
        categories: offlineCategories,
      };

      await offlineDB.saveAssessment(offlineAssessment);

      const syncItem: SyncQueueItem<OfflineAssessment> = {
        id: uuidv4(),
        entity_type: "assessment",
        entity_id: tempId,
        operation: "create",
        data: offlineAssessment,
        retry_count: 0,
        max_retries: 5,
        priority: "normal",
        created_at: now,
      };

      await offlineDB.addToSyncQueue(syncItem);

      return offlineAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
    },
  });
}

// Hook to update an assessment (offline-first)
export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedAssessment: Partial<OfflineAssessment> & { assessment_id: string }) => {
      const now = new Date().toISOString();
      const existingAssessment = await offlineDB.getAssessment(updatedAssessment.assessment_id);

      if (!existingAssessment) {
        throw new Error("Assessment not found");
      }

      const newAssessment: OfflineAssessment = {
        ...existingAssessment,
        ...updatedAssessment,
        updated_at: now,
        sync_status: 'pending',
      };

      await offlineDB.saveAssessment(newAssessment);

      const syncItem: SyncQueueItem<OfflineAssessment> = {
        id: uuidv4(),
        entity_type: "assessment",
        entity_id: newAssessment.assessment_id,
        operation: "update",
        data: newAssessment,
        retry_count: 0,
        max_retries: 5,
        priority: "normal",
        created_at: now,
      };

      await offlineDB.addToSyncQueue(syncItem);

      return newAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY, data.assessment_id] });
    },
  });
}

// Hook to submit an assessment (offline-first)
export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      const now = new Date().toISOString();
      const existingAssessment = await offlineDB.getAssessment(assessmentId);

      if (!existingAssessment) {
        throw new Error("Assessment not found");
      }

      const updatedAssessment: OfflineAssessment = {
        ...existingAssessment,
        status: 'submitted',
        updated_at: now,
        sync_status: 'pending',
      };

      await offlineDB.saveAssessment(updatedAssessment);

      const syncItem: SyncQueueItem<{ assessment_id: string }> = {
        id: uuidv4(),
        entity_type: "assessment",
        entity_id: assessmentId,
        operation: "submit",
        data: { assessment_id: assessmentId },
        retry_count: 0,
        max_retries: 5,
        priority: "high",
        created_at: now,
      };

      await offlineDB.addToSyncQueue(syncItem);

      return updatedAssessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY, data.assessment_id] });
    },
  });
}

// Hook to delete an assessment (offline-first)
export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      return apiInterceptor.interceptMutation(
        () => AssessmentsService.deleteAssessmentsByAssessmentId({ assessmentId }),
        async () => {
          await offlineDB.deleteAssessment(assessmentId);
        },
        { assessment_id: assessmentId },
        "assessment",
        "delete"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
    },
  });
}