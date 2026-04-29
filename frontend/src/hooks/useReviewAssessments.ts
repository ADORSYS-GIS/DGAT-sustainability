import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineSubmission, OfflinePendingReviewSubmission, OfflineRecommendation } from "@/types/offline";
import { useAuth } from "./shared/useAuth";

const REVIEW_ASSESSMENTS_QUERY_KEY = "review_assessments";

// Hook to get all submissions for review from IndexedDB
export function useReviewAssessments() {
  const { user, loading: authLoading } = useAuth();
  const currentOrganizationId = user?.organization || (
    user?.organizations
      ? user.organizations[Object.keys(user.organizations)[0]]?.id
      : undefined
  );

  return useQuery({
    queryKey: [REVIEW_ASSESSMENTS_QUERY_KEY, currentOrganizationId],
    queryFn: async () => {
      if (authLoading) {
        return [];
      }

      const submissions = await offlineDB.getAllSubmissions();
      const submissionsToReview = submissions.filter(
        (submission) => submission.review_status === 'under_review'
      ).filter(
        (submission) => {
          if (!currentOrganizationId) {
            return true;
          }

          const submissionOrganizationId =
            submission.organization_id ||
            (submission as OfflineSubmission & { org_id?: string }).org_id;
          return submissionOrganizationId === currentOrganizationId;
        }
      );
      return submissionsToReview.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    },
    enabled: !authLoading,
  });
}

// Hook to get a single submission for review from IndexedDB
export function useReviewAssessment(submissionId: string) {
  return useQuery({
    queryKey: [REVIEW_ASSESSMENTS_QUERY_KEY, submissionId],
    queryFn: () => offlineDB.getSubmission(submissionId),
    enabled: !!submissionId,
  });
}

// Type for submitting a review
export type SubmitReviewInput = {
  submission_id: string;
  recommendation: string;
  status: 'approved' | 'rejected';
  reviewer: string;
};

// Hook to submit a review for an assessment (offline-first)
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ submission_id, recommendation, status, reviewer }: SubmitReviewInput) => {
      const now = new Date().toISOString();
      const existingSubmission = await offlineDB.getSubmission(submission_id);

      if (!existingSubmission) {
        throw new Error("Submission not found");
      }

      // 1. Update the local submission to reflect the review status immediately
      const updatedSubmission: OfflineSubmission = {
        ...existingSubmission,
        review_status: status,
        reviewed_at: now,
        review_comments: recommendation,
        sync_status: 'pending', // Mark as pending sync
      };
      await offlineDB.saveSubmission(updatedSubmission);

      // 2. Add the review to the pending queue for synchronization
      const pendingReview: OfflinePendingReviewSubmission = {
        id: uuidv4(),
        submission_id,
        reviewer,
        timestamp: now,
        sync_status: 'pending',
        recommendation,
        status,
      };
      await offlineDB.savePendingReviewSubmission(pendingReview);

      const parsedRecommendations = JSON.parse(recommendation) as {
        id: string;
        category: string;
        recommendation: string;
      }[];
      const reportId = `pending_report_${submission_id}`;
      const organizationId =
        existingSubmission.organization_id ||
        (existingSubmission as OfflineSubmission & { org_id?: string }).org_id ||
        "unknown";
      const organizationName = existingSubmission.org_name || "Unknown Organization";

      const offlineRecommendations: OfflineRecommendation[] = parsedRecommendations.map((rec) => ({
        recommendation_id: rec.id,
        report_id: reportId,
        submission_id,
        assessment_id: existingSubmission.assessment_id,
        assessment_name: existingSubmission.assessment_name || "Unknown Assessment",
        category: rec.category,
        recommendation: rec.recommendation,
        status: "todo",
        created_at: now,
        organization_id: organizationId,
        organization_name: organizationName,
        updated_at: now,
        sync_status: "pending",
        local_changes: true,
      }));
      await offlineDB.saveRecommendations(offlineRecommendations);

      // 3. Add to sync queue for API synchronization
      // We import apiInterceptor dynamically to avoid circular dependencies if any
      const { apiInterceptor } = await import('@/services/apiInterceptor');
      await apiInterceptor.addToSyncQueue(
        {
          submission_id,
          recommendation,
          status,
          reviewer
        },
        'report',
        'create'
      );

      // Trigger immediate sync if online
      if (apiInterceptor['isOnline']) {
        // We can't easily access the private method, so we'll just let the event listener or interval handle it
        // Or we could trigger a manual sync if exposed
        // apiInterceptor.manualSync();
      }

      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'user_recommendations' } }));
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'recommendations' } }));

      return updatedSubmission;
    },
    onSuccess: (updatedSubmission) => {
      // Optimistically update the list of submissions to review
      queryClient.setQueryData<OfflineSubmission[]>(
        [REVIEW_ASSESSMENTS_QUERY_KEY],
        (oldData) => {
          if (!oldData) return [];
          // Remove the submission that was just reviewed
          return oldData.filter(
            (submission) => submission.submission_id !== updatedSubmission.submission_id
          );
        }
      );

      // Also update the query data for the single submission if it's cached
      queryClient.setQueryData(
        [REVIEW_ASSESSMENTS_QUERY_KEY, updatedSubmission.submission_id],
        updatedSubmission
      );

      // Force immediate sync check
      import('@/services/syncService').then(({ syncService }) => {
        syncService.performFullSync();
      });
    },
  });
}
