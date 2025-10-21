/**
 * @file ReviewAssessments.tsx
 * @description This file defines the ReviewAssessments page, which allows administrators to review and approve submitted assessments.
 */
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineOrganizations } from "@/hooks/useOfflineOrganizations";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "@/hooks/useOfflineCategoryCatalogs";
import {
  usePendingReviewSubmissions,
} from "@/hooks/usePendingReviewSubmissions";
import {
  useReviewAssessments,
  useSubmitReview,
} from "@/hooks/useReviewAssessments";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { OfflineSubmission } from "@/types/offline";
import { Header } from "@/components/pages/user/ReviewAssessments/Header";
import { SubmissionCard } from "@/components/pages/user/ReviewAssessments/SubmissionCard";
import { ReviewDialog } from "@/components/pages/user/ReviewAssessments/ReviewDialog";
import { NoSubmissions } from "@/components/pages/user/ReviewAssessments/NoSubmissions";
import { Loading } from "@/components/pages/user/ReviewAssessments/Loading";
import { Error } from "@/components/pages/user/ReviewAssessments/Error";

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

const ReviewAssessments: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] =
    useState<OfflineSubmission | null>(null);
  const [categoryRecommendations, setCategoryRecommendations] = useState<
    CategoryRecommendation[]
  >([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useReviewAssessments();
  const { data: pendingReviewsData } = usePendingReviewSubmissions();
  const { data: questionsData, isLoading: questionsLoading } =
    useOfflineQuestions();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useOfflineCategoryCatalogs();
  const { organizations: organizationsData, isLoading: organizationsLoading } =
    useOfflineOrganizations();
  const { mutateAsync: submitReview } = useSubmitReview();

  const categoryIdMap = useMemo(() => {
    if (!categoriesData) return new Map();
    const map = new Map<string, string>();
    categoriesData.forEach((c) => {
      map.set(c.category_catalog_id, c.name);
    });
    return map;
  }, [categoriesData]);

  const questionsMap = useMemo(() => {
    if (!questionsData) return new Map();
    const map = new Map<string, { text: string; category: string }>();
    questionsData.forEach((q) => {
      if (q.latest_revision) {
        const categoryName =
          categoryIdMap.get(q.category_id) || "Unknown Category";
        map.set(q.latest_revision.question_revision_id, {
          text: (q.latest_revision.text as { en: string })?.en || "",
          category: categoryName,
        });
      }
    });
    return map;
  }, [questionsData, categoryIdMap]);

  const organizationsMap = useMemo(() => {
    if (!organizationsData) return new Map();
    const map = new Map<string, string>();
    organizationsData.forEach((o) => {
      map.set(o.id, o.name);
    });
    return map;
  }, [organizationsData]);

  const submissionsForReview = submissionsData || [];

  const addCategoryRecommendation = (
    category: string,
    recommendation: string
  ) => {
    const newRecommendation: CategoryRecommendation = {
      id: crypto.randomUUID(),
      category,
      recommendation,
      timestamp: new Date(),
    };
    setCategoryRecommendations((prev) => [...prev, newRecommendation]);
  };

  const removeCategoryRecommendation = (id: string) => {
    setCategoryRecommendations((prev) =>
      prev.filter((rec) => rec.id !== id)
    );
  };

  const handleSubmitReview = async (status: "approved" | "rejected") => {
    if (!selectedSubmission || categoryRecommendations.length === 0) {
      toast.error(
        t("reviewAssessments.pleaseAddRecommendations", {
          defaultValue: "Please add at least one recommendation",
        })
      );
      return;
    }

    if (!user?.sub) {
      toast.error(
        t("reviewAssessments.reviewerNotFound", {
          defaultValue: "Reviewer information not found. Please log in again.",
        })
      );
      return;
    }

    setIsSubmitting(true);

    const reviewData = {
      submission_id: selectedSubmission.submission_id,
      recommendation: JSON.stringify(categoryRecommendations),
      status,
      reviewer: user.sub,
    };

    try {
      await submitReview(reviewData);
      toast.success(
        t("reviewAssessments.reviewQueued", {
          defaultValue: "Review has been queued for submission.",
        })
      );
      setIsReviewDialogOpen(false);
      setSelectedSubmission(null);
      setCategoryRecommendations([]);
    } catch (error) {
      console.error("Failed to queue review:", error);
      toast.error(
        t("reviewAssessments.queueFailed", {
          defaultValue: "Failed to queue review for submission.",
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    submissionsLoading ||
    questionsLoading ||
    organizationsLoading ||
    categoriesLoading
  ) {
    return <Loading />;
  }

  if (submissionsError) {
    return <Error onRetry={refetchSubmissions} />;
  }

  return (
    <div className="container mx-auto p-6">
      <Header
        pendingReviewsCount={pendingReviewsData?.length || 0}
        onBack={() => navigate("/dashboard")}
      />

      <div className="grid gap-4">
        {submissionsForReview.length === 0 ? (
          <NoSubmissions />
        ) : (
          submissionsForReview.map((submission) => (
            <SubmissionCard
              key={submission.submission_id}
              submission={submission}
              organizationsMap={organizationsMap}
              onReview={() => {
                setSelectedSubmission(submission);
                setCategoryRecommendations([]);
                setIsReviewDialogOpen(true);
              }}
            />
          ))
        )}
      </div>

      <ReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        submission={selectedSubmission}
        organizationsMap={organizationsMap}
        questionsMap={questionsMap}
        categoryRecommendations={categoryRecommendations}
        addCategoryRecommendation={addCategoryRecommendation}
        removeCategoryRecommendation={removeCategoryRecommendation}
        handleSubmitReview={handleSubmitReview}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ReviewAssessments;
