import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PendingReviews } from "../PendingReviews";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        "adminDashboard.pendingReviewsCard": "Pending Reviews",
        "adminDashboard.pendingCount":
          options?.count === 1 ? "pending" : "pending",
        "adminDashboard.loadingSubmissions": "Loading submissions...",
        "adminDashboard.underReview": "Under Review",
        "adminDashboard.reviewRequired": "Review Required",
        "adminDashboard.allUpToDate": "All up to date!",
      };
      return translations[key] || key;
    },
  }),
}));

describe("PendingReviews", () => {
  const mockReviews = [
    {
      id: "1",
      organization: "Test Org 1",
      type: "sustainability",
      submittedAt: "2024-01-15",
      reviewStatus: "under_review",
    },
    {
      id: "2",
      organization: "Test Org 2",
      type: "sustainability",
      submittedAt: "2024-01-16",
      reviewStatus: "pending",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render pending reviews with count", () => {
    render(
      <PendingReviews reviews={mockReviews} count={2} isLoading={false} />,
    );

    expect(screen.getByText("Pending Reviews")).toBeInTheDocument();
    expect(screen.getByText("2 pending")).toBeInTheDocument();
    expect(screen.getByText("Test Org 1")).toBeInTheDocument();
    expect(screen.getByText("Test Org 2")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<PendingReviews reviews={[]} count={0} isLoading={true} />);

    expect(screen.getByText("Loading submissions...")).toBeInTheDocument();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show empty state when no reviews", () => {
    render(<PendingReviews reviews={[]} count={0} isLoading={false} />);

    expect(screen.getByText("All up to date!")).toBeInTheDocument();
  });

  it("should navigate to reviews page when review is clicked", () => {
    render(
      <PendingReviews reviews={mockReviews} count={2} isLoading={false} />,
    );

    const firstReview = screen
      .getByText("Test Org 1")
      .closest(".cursor-pointer");
    fireEvent.click(firstReview!);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/reviews");
  });
});
