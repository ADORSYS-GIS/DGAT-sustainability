import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionHeader } from "../SubmissionHeader";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        viewSubmission: "View Submission",
        status: "Status",
        submittedAt: "Submitted At",
        reviewedAt: "Reviewed At",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("SubmissionHeader", () => {
  const mockSubmission = {
    id: "sub1",
    review_status: "under_review",
    submitted_at: "2024-01-01T10:00:00Z",
    reviewed_at: "2024-01-02T15:30:00Z",
  } as any;

  it("renders submission title and status", () => {
    render(<SubmissionHeader submission={mockSubmission} />);

    expect(screen.getByText("View Submission")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
  });

  it("displays submitted date", () => {
    render(<SubmissionHeader submission={mockSubmission} />);

    expect(screen.getByText("Submitted At")).toBeInTheDocument();
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
  });

  it("displays reviewed date when available", () => {
    render(<SubmissionHeader submission={mockSubmission} />);

    expect(screen.getByText("Reviewed At")).toBeInTheDocument();
    expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
  });

  it("does not display reviewed date when not available", () => {
    const submissionWithoutReview = {
      ...mockSubmission,
      reviewed_at: null,
    };

    render(<SubmissionHeader submission={submissionWithoutReview} />);

    expect(screen.queryByText("Reviewed At")).not.toBeInTheDocument();
  });
});
