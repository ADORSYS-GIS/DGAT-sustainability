import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/shared/useAuth";
import {
  useOfflineAdminSubmissions,
  useOfflineSyncStatus,
} from "@/hooks/useOfflineApi";
import { ReportsService } from "@/openapi-rq/requests/services.gen";
import { AdminSubmissionDetail } from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "@/services/indexeddb";

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

interface PendingReviewSubmission {
  id: string;
  submissionId: string;
  categoryRecommendations: CategoryRecommendation[];
  reviewer: string;
  timestamp: Date;
  syncStatus: "pending" | "synced";
}

export const useReviewAssessments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] =
    useState<AdminSubmissionDetail | null>(null);
  const [categoryRecommendations, setCategoryRecommendations] = useState<
    CategoryRecommendation[]
  >([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState("");
  const [isAddingRecommendation, setIsAddingRecommendation] =
    useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<
    PendingReviewSubmission[]
  >([]);

  // Use offline hooks
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useOfflineAdminSubmissions();
  const { isOnline } = useOfflineSyncStatus();

  // Load pending reviews from IndexedDB
  useEffect(() => {
    const loadPendingReviews = async () => {
      try {
        const pendingReviews = await offlineDB.getAllPendingReviewSubmissions();
        setPendingReviews(pendingReviews);
      } catch (error) {
        console.error("Failed to load pending reviews:", error);
      }
    };
    loadPendingReviews();
  }, []);

  // Filter submissions for review
  const submissionsForReview =
    submissionsData?.submissions?.filter(
      (submission) => submission.review_status === "under_review",
    ) || [];

  // Get responses from the selected submission (they're already included in the submission data)
  const submissionResponses = selectedSubmission?.content?.responses || [];

  // Listen for sync completion and update pending reviews
  useEffect(() => {
    const handleSyncComplete = async () => {
      // Check if any pending reviews should be marked as synced
      const allPendingReviews =
        await offlineDB.getAllPendingReviewSubmissions();
      const pendingReviews = allPendingReviews.filter(
        (r) => r.syncStatus === "pending",
      );

      if (pendingReviews.length > 0) {
        // Mark them as synced since the sync queue has been processed
        for (const review of pendingReviews) {
          await offlineDB.updatePendingReviewSubmission(review.id, "synced");
        }

        // Update the local state
        setPendingReviews((prev) =>
          prev.map((r) => ({ ...r, syncStatus: "synced" as const })),
        );
      }
    };

    // Listen for online events which trigger sync
    window.addEventListener("online", handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleSyncComplete);
    };
  }, []);

  const handleReviewSubmission = (submission: AdminSubmissionDetail) => {
    setSelectedSubmission(submission);
    setCategoryRecommendations([]);
    setIsReviewDialogOpen(true);
  };

  const addCategoryRecommendation = (
    category: string,
    recommendation: string,
  ) => {
    if (!recommendation.trim()) return;

    const newRecommendation: CategoryRecommendation = {
      id: `rec_${Date.now()}_${Math.random()}`,
      category,
      recommendation,
      timestamp: new Date(),
    };

    // Add the new recommendation to the existing list (don't filter out existing ones)
    setCategoryRecommendations([...categoryRecommendations, newRecommendation]);
  };

  const removeCategoryRecommendation = (id: string) => {
    setCategoryRecommendations(
      categoryRecommendations.filter((r) => r.id !== id),
    );
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission || categoryRecommendations.length === 0) {
      toast.error(
        t("reviewAssessments.pleaseAddRecommendations", {
          defaultValue: "Please add at least one recommendation",
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create pending review for UI
      const pendingReview: PendingReviewSubmission = {
        id: crypto.randomUUID(),
        submissionId: selectedSubmission.submission_id,
        categoryRecommendations,
        reviewer: user?.email || "Unknown",
        timestamp: new Date(),
        syncStatus: "pending",
      };

      setPendingReviews((prev) => [...prev, pendingReview]);

      // Use the OpenAPI-generated service directly
      const result = await ReportsService.postSubmissionsBySubmissionIdReports({
        submissionId: selectedSubmission.submission_id,
        requestBody: categoryRecommendations.map((rec) => ({
          category: rec.category,
          recommendation: rec.recommendation,
        })),
      });

      console.log("✅ Report generation successful:", result.report_id);

      // Update the pending review status
      setPendingReviews((prev) =>
        prev.map((review) =>
          review.submissionId === selectedSubmission.submission_id
            ? { ...review, syncStatus: "synced" as const }
            : review,
        ),
      );

      toast.success(
        t("reviewAssessments.reviewSubmitted", {
          defaultValue: "Review submitted successfully",
        }),
      );

      setIsReviewDialogOpen(false);
      setSelectedSubmission(null);
      setCategoryRecommendations([]);
      refetchSubmissions();
      queryClient.invalidateQueries({ queryKey: ["adminSubmissions"] });
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error(
        t("reviewAssessments.failedToSubmitReview", {
          defaultValue: "Failed to submit review",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "under_review":
        return {
          variant: "secondary",
          className: "bg-yellow-100 text-yellow-800",
          text: t("reviewAssessments.underReview", {
            defaultValue: "Under Review",
          }),
        };
      case "approved":
        return {
          variant: "default",
          className: "bg-green-100 text-green-800",
          text: t("reviewAssessments.approved", { defaultValue: "Approved" }),
        };
      case "rejected":
        return {
          variant: "destructive",
          className: "",
          text: t("reviewAssessments.rejected", { defaultValue: "Rejected" }),
        };
      default:
        return { variant: "outline", className: "", text: status };
    }
  };

  // Manual sync function - now just refreshes data
  const handleManualSync = async () => {
    try {
      await refetchSubmissions(); // Refresh the submissions list
    } catch (error) {
      console.error(
        t("reviewAssessments.manualSyncFailed", {
          defaultValue: "Manual sync failed:",
        }),
        error,
      );
    }
  };

  return {
    // State
    selectedSubmission,
    setSelectedSubmission,
    categoryRecommendations,
    setCategoryRecommendations,
    isReviewDialogOpen,
    setIsReviewDialogOpen,
    currentComment,
    setCurrentComment,
    isAddingRecommendation,
    setIsAddingRecommendation,
    expandedCategories,
    setExpandedCategories,
    isSubmitting,
    pendingReviews,

    // Data
    submissionsForReview,
    submissionResponses,
    isLoading: submissionsLoading,
    error: submissionsError,
    isOnline,

    // Functions
    handleReviewSubmission,
    addCategoryRecommendation,
    removeCategoryRecommendation,
    handleSubmitReview,
    getStatusBadge,
    handleManualSync,
    refetch: refetchSubmissions,
  };
};
