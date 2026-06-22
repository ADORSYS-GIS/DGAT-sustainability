import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineSubmission, OfflinePendingReviewSubmission, OfflineRecommendation } from "@/types/offline";
import { useAuth } from "./shared/useAuth";
import { AdminService } from "@/openapi-rq/requests/services.gen";
import { DataTransformationService } from "@/services/dataTransformation";

const REVIEW_ASSESSMENTS_QUERY_KEY = "review_assessments";

// Hook to get all submissions for review from IndexedDB
export function useReviewAssessments() {
  const { user, loading: authLoading } = useAuth();
  // Collect all organization IDs the user belongs to
  const userOrganizationIds = new Set<string>();
  
  if (user?.organizations && typeof user.organizations === 'object') {
    Object.values(user.organizations).forEach((org: any) => {
      if (org?.id && typeof org.id === 'string') {
        userOrganizationIds.add(org.id);
      }
    });
  } else if (user?.organization && typeof user.organization === 'string') {
    // Fallback only if organization is a single string ID
    userOrganizationIds.add(user.organization);
  }

  // Fallback for context fetching (just uses the first one as before)
  const currentOrganizationId = userOrganizationIds.size > 0 
    ? Array.from(userOrganizationIds)[0] 
    : undefined;

  return useQuery({
    queryKey: [REVIEW_ASSESSMENTS_QUERY_KEY, Array.from(userOrganizationIds)],
    queryFn: async () => {
      if (authLoading) {
        return [];
      }

      try {
        const adminSubmissions = await AdminService.getAdminSubmissions({ status: "under_review" });
        if (adminSubmissions?.submissions) {
          const assessments = await offlineDB.getAllAssessments();
          const transformedSubmissions = DataTransformationService.transformAdminSubmissionsWithContext(
            adminSubmissions.submissions,
            assessments,
            currentOrganizationId,
            user?.email
          );
          await offlineDB.saveSubmissions(transformedSubmissions);
        }
      } catch (error) {
        console.warn("Could not refresh review assessments from API, using local data.", error);
      }

      const submissions = await offlineDB.getAllSubmissions();
      
      console.log("[DEBUG] All submissions from offlineDB:", submissions.length, submissions.map(s => ({id: s.submission_id, org: s.organization_id || (s as any).org_id, status: s.review_status})));
      console.log("[DEBUG] User org IDs:", Array.from(userOrganizationIds));

      const submissionsToReview = submissions.filter(
        (submission) => submission.review_status === 'under_review'
      ).filter(
        (submission) => {
          if (userOrganizationIds.size === 0) {
            return true; // If user has no specific orgs, show all (Super Admin case)
          }

          const submissionOrganizationId =
            submission.organization_id ||
            (submission as OfflineSubmission & { org_id?: string }).org_id;
            
          if (!submissionOrganizationId) return false;
          
          const isMatch = userOrganizationIds.has(submissionOrganizationId);
          if (!isMatch) {
            console.log(`[DEBUG] Filtered out submission ${submission.submission_id}: org ${submissionOrganizationId} not in user orgs`);
          }
          return isMatch;
        }
      );
      
      console.log("[DEBUG] Final submissionsToReview:", submissionsToReview.length);
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
      try {
        const { apiInterceptor } = await import('@/services/apiInterceptor');
        if (!apiInterceptor) {
          throw new Error("API Interceptor not initialized");
        }
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
        console.log(`[useSubmitReview] Successfully queued review for submission ${submission_id}`);

        // Trigger immediate sync if online
        if (apiInterceptor.isOnline) {
          console.log('[useSubmitReview] Online - triggering immediate sync');
          // Trigger sync service to process queue immediately
          const { syncService } = await import('@/services/syncService');
          syncService.performFullSync().catch((syncError: Error) => {
            console.warn('[useSubmitReview] Background sync failed, will retry later:', syncError);
          });
        }
      } catch (queueError) {
        console.error('[useSubmitReview] Failed to add to sync queue:', queueError);
        // Re-throw the error so the mutation fails and shows proper error message
        throw new Error(`Failed to queue review: ${queueError instanceof Error ? queueError.message : 'Unknown error'}`);
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
