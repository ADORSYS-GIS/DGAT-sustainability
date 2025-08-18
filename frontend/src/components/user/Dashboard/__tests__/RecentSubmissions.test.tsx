import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecentSubmissions } from "../RecentSubmissions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "user.dashboard.recentSubmissions": "Recent Submissions",
        "user.dashboard.viewAll": "View All",
        "user.dashboard.loadingSubmissionsInline": "Loading submissions...",
        "user.dashboard.sustainabilityAssessment": "Sustainability Assessment",
        "user.dashboard.noSubmissions": "No submissions yet",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("RecentSubmissions", () => {
  const mockSubmissions = [
    {
      submission_id: "sub1",
      submitted_at: "2024-01-01T10:00:00Z",
      review_status: "under_review",
    },
    {
      submission_id: "sub2",
      submitted_at: "2024-01-02T15:30:00Z",
      review_status: "approved",
    },
  ] as any[];

  const defaultProps = {
    submissions: mockSubmissions,
    isLoading: false,
    onViewAll: vi.fn(),
    getStatusColor: (status: string) =>
      status === "approved" ? "bg-green-100" : "bg-yellow-100",
    formatStatus: (status: string) => status.replace("_", " "),
  };

  it("renders recent submissions title and view all button", () => {
    render(<RecentSubmissions {...defaultProps} />);

    expect(screen.getByText("Recent Submissions")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view all/i }),
    ).toBeInTheDocument();
  });

  it("displays submissions when not loading", () => {
    render(<RecentSubmissions {...defaultProps} />);

    const assessmentTitles = screen.getAllByText("Sustainability Assessment");
    expect(assessmentTitles).toHaveLength(2);
    expect(screen.getByText("under review")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    render(<RecentSubmissions {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Loading submissions...")).toBeInTheDocument();
  });

  it("shows no submissions message when empty", () => {
    render(<RecentSubmissions {...defaultProps} submissions={[]} />);

    expect(screen.getByText("No submissions yet")).toBeInTheDocument();
  });

  it("calls onViewAll when view all button is clicked", () => {
    const onViewAll = vi.fn();
    render(<RecentSubmissions {...defaultProps} onViewAll={onViewAll} />);

    fireEvent.click(screen.getByRole("button", { name: /view all/i }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
