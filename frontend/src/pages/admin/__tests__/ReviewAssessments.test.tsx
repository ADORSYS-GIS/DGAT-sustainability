import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewAssessments from "../ReviewAssessments";

// Mock the hook
vi.mock("@/hooks/admin/useReviewAssessments", () => ({
  useReviewAssessments: () => ({
    selectedSubmission: null,
    setSelectedSubmission: vi.fn(),
    categoryRecommendations: [],
    setCategoryRecommendations: vi.fn(),
    isReviewDialogOpen: false,
    setIsReviewDialogOpen: vi.fn(),
    currentComment: "",
    setCurrentComment: vi.fn(),
    isAddingRecommendation: false,
    setIsAddingRecommendation: vi.fn(),
    expandedCategories: [],
    setExpandedCategories: vi.fn(),
    isSubmitting: false,
    pendingReviews: [],
    submissionsForReview: [],
    submissionResponses: [],
    isLoading: false,
    error: null,
    isOnline: true,
    handleReviewSubmission: vi.fn(),
    addCategoryRecommendation: vi.fn(),
    removeCategoryRecommendation: vi.fn(),
    handleSubmitReview: vi.fn(),
    getStatusBadge: vi.fn(),
    handleManualSync: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock components
vi.mock("@/components/admin/ReviewAssessments", () => ({
  ReviewHeader: () => <div data-testid="review-header">Header</div>,
  ReviewStatusIndicators: () => (
    <div data-testid="status-indicators">Status</div>
  ),
  SubmissionsTable: () => <div data-testid="submissions-table">Table</div>,
  ReviewDialog: () => <div data-testid="review-dialog">Dialog</div>,
  ErrorState: () => <div data-testid="error-state">Error</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("ReviewAssessments", () => {
  it("renders review assessments components", () => {
    render(<ReviewAssessments />);

    expect(screen.getByTestId("review-header")).toBeInTheDocument();
    expect(screen.getByTestId("status-indicators")).toBeInTheDocument();
    expect(screen.getByTestId("submissions-table")).toBeInTheDocument();
  });
});
