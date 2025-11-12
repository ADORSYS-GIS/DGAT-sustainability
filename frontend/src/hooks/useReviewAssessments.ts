import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineSubmission, OfflinePendingReviewSubmission } from "@/types/offline";

const REVIEW_ASSESSMENTS_QUERY_KEY = "review_assessments";

// Hook to get all submissions for review from IndexedDB
export function useReviewAssessments() {
  return useQuery({
    queryKey: [REVIEW_ASSESSMENTS_QUERY_KEY],
    queryFn: async () => {
      const submissions = await offlineDB.getAllSubmissions();
      const submissionsToReview = submissions.filter(
        (submission) => submission.review_status === 'under_review'
      );
      return submissionsToReview.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    },
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
    },
  });
}