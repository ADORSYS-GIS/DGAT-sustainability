import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineDB } from "@/services/indexeddb";
import type { OfflinePendingReviewSubmission } from "@/types/offline";

const PENDING_REVIEW_SUBMISSIONS_QUERY_KEY = "pending_review_submissions";

// Hook to get all pending review submissions from IndexedDB
export function usePendingReviewSubmissions() {
  return useQuery({
    queryKey: [PENDING_REVIEW_SUBMISSIONS_QUERY_KEY],
    queryFn: () => offlineDB.getAllPendingReviewSubmissions(),
  });
}

// Hook to add a pending review submission to IndexedDB
export function useAddPendingReviewSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pendingReview: Omit<OfflinePendingReviewSubmission, 'id'>) => {
      const newReview: OfflinePendingReviewSubmission = {
        ...pendingReview,
        id: crypto.randomUUID(),
      };
      return offlineDB.savePendingReviewSubmission(newReview);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PENDING_REVIEW_SUBMISSIONS_QUERY_KEY] });
    },
  });
}