import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAdminDashboard } from "../useAdminDashboard";
import { createMockCategory, createMockSubmission } from "@/test/setup";

// Mock the offline API hooks
vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineAdminSubmissions: vi.fn(),
  useOfflineCategories: vi.fn(),
  useOfflineQuestions: vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Import the mocked functions
import {
  useOfflineAdminSubmissions,
  useOfflineCategories,
  useOfflineQuestions,
} from "@/hooks/useOfflineApi";

describe("useAdminDashboard", () => {
  const mockSubmissions = [
    createMockSubmission({
      submission_id: "1",
      review_status: "under_review",
      org_name: "Org 1",
      assessment_id: "assess-1",
      user_id: "user-1",
      org_id: "org-1",
    }),
    createMockSubmission({
      submission_id: "2",
      review_status: "approved",
      org_name: "Org 2",
      assessment_id: "assess-2",
      user_id: "user-2",
      org_id: "org-2",
    }),
    createMockSubmission({
      submission_id: "3",
      review_status: "rejected",
      org_name: "Org 3",
      assessment_id: "assess-3",
      user_id: "user-3",
      org_id: "org-3",
    }),
    createMockSubmission({
      submission_id: "4",
      review_status: "reviewed",
      org_name: "Org 4",
      assessment_id: "assess-4",
      user_id: "user-4",
      org_id: "org-4",
    }),
  ];

  const mockCategories = [
    createMockCategory({ category_id: "1", name: "Category 1" }),
    createMockCategory({ category_id: "2", name: "Category 2" }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
      data: { submissions: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useOfflineCategories).mockReturnValue({
      data: { categories: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useOfflineQuestions).mockReturnValue({
      data: { questions: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useAdminDashboard());

      expect(result.current.pendingReviews).toEqual([]);
      expect(result.current.pendingReviewsCount).toBe(0);
      expect(result.current.systemStats).toHaveLength(4);
      expect(result.current.adminActions).toHaveLength(6);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("pending reviews", () => {
    it("should filter pending submissions correctly", () => {
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: mockSubmissions },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      expect(result.current.pendingReviewsCount).toBe(1);
      expect(result.current.pendingReviews).toHaveLength(1);
      expect(result.current.pendingReviews[0].id).toBe("1");
      expect(result.current.pendingReviews[0].organization).toBe("Org 1");
    });

    it("should include both under_review and pending_review statuses", () => {
      const submissionsWithPending = [
        ...mockSubmissions,
        createMockSubmission({
          submission_id: "5",
          review_status: "pending_review",
          org_name: "Org 5",
          assessment_id: "assess-5",
          user_id: "user-5",
          org_id: "org-5",
        }),
      ];

      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: submissionsWithPending },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      expect(result.current.pendingReviewsCount).toBe(2);
      expect(result.current.pendingReviews).toHaveLength(2);
    });
  });

  describe("completed assessments count", () => {
    it("should count approved, rejected, and reviewed submissions", () => {
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: mockSubmissions },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const completedStat = result.current.systemStats.find(
        (stat) => stat.label === "adminDashboard.completedAssessments",
      );
      expect(completedStat?.value).toBe(3); // approved + rejected + reviewed
    });

    it("should return 0 when no completed submissions", () => {
      const onlyPendingSubmissions = [
        createMockSubmission({
          submission_id: "1",
          review_status: "under_review",
          org_name: "Org 1",
          assessment_id: "assess-1",
          user_id: "user-1",
          org_id: "org-1",
        }),
      ];

      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: onlyPendingSubmissions },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const completedStat = result.current.systemStats.find(
        (stat) => stat.label === "adminDashboard.completedAssessments",
      );
      expect(completedStat?.value).toBe(0);
    });
  });

  describe("system stats", () => {
    it("should calculate category count correctly", () => {
      vi.mocked(useOfflineCategories).mockReturnValue({
        data: { categories: mockCategories },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const categoryStat = result.current.systemStats.find(
        (stat) => stat.label === "adminDashboard.numCategories",
      );
      expect(categoryStat?.value).toBe(2);
    });

    it("should calculate question count correctly", () => {
      const mockQuestions = [
        {
          question_id: "1",
          category: "Category 1",
          created_at: "2024-01-01T00:00:00Z",
          latest_revision: {
            question_revision_id: "rev-1",
            question_id: "1",
            text: { en: "Question 1" },
            weight: 5,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          question_id: "2",
          category: "Category 2",
          created_at: "2024-01-01T00:00:00Z",
          latest_revision: {
            question_revision_id: "rev-2",
            question_id: "2",
            text: { en: "Question 2" },
            weight: 3,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          question_id: "3",
          category: "Category 1",
          created_at: "2024-01-01T00:00:00Z",
          latest_revision: {
            question_revision_id: "rev-3",
            question_id: "3",
            text: { en: "Question 3" },
            weight: 4,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      ];

      vi.mocked(useOfflineQuestions).mockReturnValue({
        data: { questions: mockQuestions },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const questionStat = result.current.systemStats.find(
        (stat) => stat.label === "adminDashboard.numQuestions",
      );
      expect(questionStat?.value).toBe(3);
    });

    it("should show loading state when data is loading", () => {
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: [] },
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      expect(result.current.isLoading).toBe(true);

      const pendingReviewsStat = result.current.systemStats.find(
        (stat) => stat.label === "adminDashboard.pendingReviews",
      );
      expect(pendingReviewsStat?.loading).toBe(true);
    });
  });

  describe("admin actions", () => {
    it("should provide all required admin actions", () => {
      const { result } = renderHook(() => useAdminDashboard());

      const actionTitles = result.current.adminActions.map(
        (action) => action.title,
      );

      expect(actionTitles).toContain("adminDashboard.manageOrganizations");
      expect(actionTitles).toContain("adminDashboard.manageUsers");
      expect(actionTitles).toContain("adminDashboard.manageCategories");
      expect(actionTitles).toContain("adminDashboard.manageQuestions");
      expect(actionTitles).toContain("adminDashboard.reviewAssessments");
      expect(actionTitles).toContain("adminDashboard.standardRecommendations");
    });

    it("should have proper action structure", () => {
      const { result } = renderHook(() => useAdminDashboard());

      result.current.adminActions.forEach((action) => {
        expect(action).toHaveProperty("title");
        expect(action).toHaveProperty("description");
        expect(action).toHaveProperty("icon");
        expect(action).toHaveProperty("color");
        expect(action).toHaveProperty("onClick");
        expect(typeof action.onClick).toBe("function");
      });
    });
  });

  describe("data refresh", () => {
    it("should call refetch on mount", () => {
      const mockRefetch = vi.fn();
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderHook(() => useAdminDashboard());

      expect(mockRefetch).toHaveBeenCalled();
    });

    it("should set up periodic refetching", () => {
      vi.useFakeTimers();

      const mockRefetch = vi.fn();
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderHook(() => useAdminDashboard());

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockRefetch).toHaveBeenCalledTimes(2); // Once on mount, once after 30s

      vi.useRealTimers();
    });
  });

  describe("pending reviews data structure", () => {
    it("should format pending reviews correctly", () => {
      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: [mockSubmissions[0]] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const pendingReview = result.current.pendingReviews[0];
      expect(pendingReview).toHaveProperty("id");
      expect(pendingReview).toHaveProperty("organization");
      expect(pendingReview).toHaveProperty("type");
      expect(pendingReview).toHaveProperty("submittedAt");
      expect(pendingReview).toHaveProperty("reviewStatus");
      expect(pendingReview.type).toBe("Sustainability");
    });

    it("should format dates correctly", () => {
      const submissionWithDate = createMockSubmission({
        submission_id: "1",
        review_status: "under_review",
        submitted_at: "2024-01-15T10:30:00Z",
        org_name: "Test Org",
        assessment_id: "assess-1",
        user_id: "user-1",
        org_id: "org-1",
      });

      vi.mocked(useOfflineAdminSubmissions).mockReturnValue({
        data: { submissions: [submissionWithDate] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAdminDashboard());

      const pendingReview = result.current.pendingReviews[0];
      expect(pendingReview.submittedAt).toBe("2024-01-15");
    });
  });
});
