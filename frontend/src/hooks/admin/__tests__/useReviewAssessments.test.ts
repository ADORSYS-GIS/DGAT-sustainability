import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useReviewAssessments } from "../useReviewAssessments";
import { createMockSubmission } from "@/test/setup";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

// Mock useAuth
vi.mock("@/hooks/shared/useAuth", () => ({
  useAuth: () => ({
    user: {
      email: "test@example.com",
      id: "test-user-1",
    },
  }),
}));

// Mock ReportsService
vi.mock("@/openapi-rq/requests/services.gen", () => ({
  ReportsService: {
    postSubmissionsBySubmissionIdReports: vi.fn(),
  },
}));

// Mock offlineDB
vi.mock("@/services/indexeddb", () => ({
  offlineDB: {
    getAllPendingReviewSubmissions: vi.fn(),
    updatePendingReviewSubmission: vi.fn(),
  },
}));

describe("useReviewAssessments", () => {
  const mockSubmission = createMockSubmission({
    submission_id: "test-submission-1",
    review_status: "under_review",
    content: {
      responses: [
        {
          question_id: "q1",
          category: "Environmental",
          response: "Test response",
        },
      ],
    },
  });

  const mockSubmissionsData = {
    submissions: [mockSubmission],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.addEventListener and removeEventListener
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    // Mock crypto.randomUUID
    global.crypto = {
      randomUUID: () => "test-uuid-123",
    } as any;
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useReviewAssessments());

      expect(result.current.selectedSubmission).toBeNull();
      expect(result.current.categoryRecommendations).toEqual([]);
      expect(result.current.isReviewDialogOpen).toBe(false);
      expect(result.current.currentComment).toBe("");
      expect(result.current.isAddingRecommendation).toBe("");
      expect(result.current.expandedCategories).toEqual(new Set());
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.pendingReviews).toEqual([]);
      expect(result.current.submissionsForReview).toEqual([]);
      expect(result.current.submissionResponses).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("submission review", () => {
    it("should handle review submission", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.handleReviewSubmission(mockSubmission);
      });

      expect(result.current.selectedSubmission).toBe(mockSubmission);
      expect(result.current.isReviewDialogOpen).toBe(true);
      expect(result.current.categoryRecommendations).toEqual([]);
    });
  });

  describe("category recommendations", () => {
    it("should add category recommendation", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.addCategoryRecommendation(
          "Environmental",
          "Reduce energy consumption",
        );
      });

      expect(result.current.categoryRecommendations).toHaveLength(1);
      expect(result.current.categoryRecommendations[0]).toMatchObject({
        category: "Environmental",
        recommendation: "Reduce energy consumption",
      });
    });

    it("should not add empty recommendation", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.addCategoryRecommendation("Environmental", "");
      });

      expect(result.current.categoryRecommendations).toHaveLength(0);
    });

    it("should remove category recommendation", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // Add a recommendation first
      act(() => {
        result.current.addCategoryRecommendation(
          "Environmental",
          "Reduce energy consumption",
        );
      });

      expect(result.current.categoryRecommendations).toHaveLength(1);

      // Remove the recommendation
      act(() => {
        result.current.removeCategoryRecommendation(
          result.current.categoryRecommendations[0].id,
        );
      });

      expect(result.current.categoryRecommendations).toHaveLength(0);
    });
  });

  describe("status badge", () => {
    it("should return correct badge for under_review status", () => {
      const { result } = renderHook(() => useReviewAssessments());

      const badge = result.current.getStatusBadge("under_review");

      expect(badge).toEqual({
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800",
        text: "Under Review",
      });
    });

    it("should return correct badge for approved status", () => {
      const { result } = renderHook(() => useReviewAssessments());

      const badge = result.current.getStatusBadge("approved");

      expect(badge).toEqual({
        variant: "default",
        className: "bg-green-100 text-green-800",
        text: "Approved",
      });
    });

    it("should return correct badge for rejected status", () => {
      const { result } = renderHook(() => useReviewAssessments());

      const badge = result.current.getStatusBadge("rejected");

      expect(badge).toEqual({
        variant: "destructive",
        className: "",
        text: "Rejected",
      });
    });

    it("should return default badge for unknown status", () => {
      const { result } = renderHook(() => useReviewAssessments());

      const badge = result.current.getStatusBadge("unknown_status");

      expect(badge).toEqual({
        variant: "outline",
        className: "",
        text: "unknown_status",
      });
    });
  });

  describe("form data management", () => {
    it("should update current comment", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.setCurrentComment("Test comment");
      });

      expect(result.current.currentComment).toBe("Test comment");
    });

    it("should update adding recommendation state", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.setIsAddingRecommendation("Environmental");
      });

      expect(result.current.isAddingRecommendation).toBe("Environmental");
    });

    it("should update expanded categories", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.setExpandedCategories(new Set(["Environmental"]));
      });

      expect(result.current.expandedCategories).toEqual(
        new Set(["Environmental"]),
      );
    });
  });

  describe("submission selection", () => {
    it("should update selected submission", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.setSelectedSubmission(mockSubmission);
      });

      expect(result.current.selectedSubmission).toBe(mockSubmission);
    });

    it("should update category recommendations", () => {
      const { result } = renderHook(() => useReviewAssessments());

      const recommendations = [
        {
          id: "rec1",
          category: "Environmental",
          recommendation: "Test recommendation",
          timestamp: new Date(),
        },
      ];

      act(() => {
        result.current.setCategoryRecommendations(recommendations);
      });

      expect(result.current.categoryRecommendations).toEqual(recommendations);
    });
  });

  describe("dialog management", () => {
    it("should open and close review dialog", () => {
      const { result } = renderHook(() => useReviewAssessments());

      act(() => {
        result.current.setIsReviewDialogOpen(true);
      });

      expect(result.current.isReviewDialogOpen).toBe(true);

      act(() => {
        result.current.setIsReviewDialogOpen(false);
      });

      expect(result.current.isReviewDialogOpen).toBe(false);
    });
  });

  describe("data access", () => {
    it("should provide submissions for review", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // The submissionsForReview should be empty by default since we're using mocks
      expect(result.current.submissionsForReview).toEqual([]);
    });

    it("should provide submission responses", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // Set a selected submission
      act(() => {
        result.current.setSelectedSubmission(mockSubmission);
      });

      // The responses should come from the selected submission
      expect(result.current.submissionResponses).toEqual(
        mockSubmission.content.responses,
      );
    });
  });

  describe("loading and error states", () => {
    it("should handle loading state", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // By default, loading should be false due to our mocks
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle error state", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // By default, error should be null due to our mocks
      expect(result.current.error).toBeNull();
    });
  });

  describe("online status", () => {
    it("should provide online status", () => {
      const { result } = renderHook(() => useReviewAssessments());

      // By default, should be online due to our mocks
      expect(result.current.isOnline).toBe(true);
    });
  });
});
