/*
 * Admin page for reviewing and managing assessment submissions
 * Provides submission review interface with approval/rejection actions
 */

import React from "react";
import {
  ReviewHeader,
  ReviewStatusIndicators,
  SubmissionsTable,
  ReviewDialog,
  ErrorState,
} from "@/components/admin/ReviewAssessments";
import { LoadingState } from "@/components/shared";
import { useReviewAssessments } from "@/hooks/admin/useReviewAssessments";

const ReviewAssessments: React.FC = () => {
  const {
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
    isLoading,
    error,
    isOnline,

    // Functions
    handleReviewSubmission,
    addCategoryRecommendation,
    removeCategoryRecommendation,
    handleSubmitReview,
    getStatusBadge,
    handleManualSync,
    refetch,
  } = useReviewAssessments();

  if (isLoading) {
    return (
      <LoadingState message="Loading submissions..." variant="container" />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="container mx-auto p-6">
      <ReviewHeader />

      <ReviewStatusIndicators
        isOnline={isOnline}
        pendingReviewsCount={pendingReviews.length}
        onManualSync={handleManualSync}
      />

      <SubmissionsTable
        submissions={submissionsForReview}
        onReviewSubmission={handleReviewSubmission}
        getStatusBadge={getStatusBadge}
      />

      <ReviewDialog
        isOpen={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        selectedSubmission={selectedSubmission}
        submissionResponses={submissionResponses}
        categoryRecommendations={categoryRecommendations}
        currentComment={currentComment}
        setCurrentComment={setCurrentComment}
        isAddingRecommendation={isAddingRecommendation}
        setIsAddingRecommendation={setIsAddingRecommendation}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        isSubmitting={isSubmitting}
        onAddRecommendation={addCategoryRecommendation}
        onRemoveRecommendation={removeCategoryRecommendation}
        onSubmitReview={handleSubmitReview}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
};

export default ReviewAssessments;
