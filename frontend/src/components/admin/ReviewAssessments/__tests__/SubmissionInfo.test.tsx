import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionInfo } from "../SubmissionInfo";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "reviewAssessments.submissionDetails": "Submission Details",
        "reviewAssessments.organization": "Organization",
        "reviewAssessments.submissionDate": "Submission Date",
        "reviewAssessments.status": "Status",
        "reviewAssessments.unknown": "Unknown",
      };
      return translations[key] || key;
    },
  }),
}));

describe("SubmissionInfo", () => {
  const mockSubmission = {
    submission_id: "sub-123",
    org_name: "Test Organization",
    submitted_at: "2024-01-15T10:30:00Z",
    review_status: "pending",
    assessment_id: "assess-123",
    user_id: "user-123",
    responses: [],
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  const mockGetStatusBadge = (status: string) => {
    const badges = {
      pending: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800",
        text: "Pending Review",
      },
      approved: {
        variant: "default",
        className: "bg-green-100 text-green-800",
        text: "Approved",
      },
      rejected: {
        variant: "destructive",
        className: "bg-red-100 text-red-800",
        text: "Rejected",
      },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const defaultProps = {
    selectedSubmission: mockSubmission,
    getStatusBadge: mockGetStatusBadge,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render submission details card", () => {
    render(<SubmissionInfo {...defaultProps} />);

    expect(screen.getByText("Submission Details")).toBeInTheDocument();
  });

  it("should display organization name", () => {
    render(<SubmissionInfo {...defaultProps} />);

    const orgElements = screen.getAllByText("Test Organization");
    expect(orgElements.length).toBeGreaterThan(0);
  });

  it("should display submission ID when organization name is not available", () => {
    const submissionWithoutOrg = {
      ...mockSubmission,
      org_name: null,
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={submissionWithoutOrg}
      />,
    );

    expect(screen.getByText("sub-123")).toBeInTheDocument();
  });

  it("should display submission date in correct format", () => {
    render(<SubmissionInfo {...defaultProps} />);

    // The date should be formatted as "January 15, 2024 at 10:30 AM"
    expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
  });

  it("should display unknown when submission date is not available", () => {
    const submissionWithoutDate = {
      ...mockSubmission,
      submitted_at: null,
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={submissionWithoutDate}
      />,
    );

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("should display status badge with correct text", () => {
    render(<SubmissionInfo {...defaultProps} />);

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("should display approved status badge", () => {
    const approvedSubmission = {
      ...mockSubmission,
      review_status: "approved",
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={approvedSubmission}
      />,
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("should display rejected status badge", () => {
    const rejectedSubmission = {
      ...mockSubmission,
      review_status: "rejected",
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={rejectedSubmission}
      />,
    );

    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("should render file text icon", () => {
    render(<SubmissionInfo {...defaultProps} />);

    // The FileText icon should be present (it's rendered as an SVG)
    const fileIcons = document.querySelectorAll("svg");
    expect(fileIcons.length).toBeGreaterThan(0);
  });

  it("should display organization label", () => {
    render(<SubmissionInfo {...defaultProps} />);

    const orgLabels = screen.getAllByText("Organization");
    expect(orgLabels.length).toBeGreaterThan(0);
  });

  it("should display submission date label", () => {
    render(<SubmissionInfo {...defaultProps} />);

    expect(screen.getByText("Submission Date")).toBeInTheDocument();
  });

  it("should display status label", () => {
    render(<SubmissionInfo {...defaultProps} />);

    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("should apply correct styling to status badge", () => {
    render(<SubmissionInfo {...defaultProps} />);

    const statusBadge = screen.getByText("Pending Review");
    expect(statusBadge).toHaveClass("bg-yellow-100", "text-yellow-800");
  });

  it("should apply correct styling to approved status badge", () => {
    const approvedSubmission = {
      ...mockSubmission,
      review_status: "approved",
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={approvedSubmission}
      />,
    );

    const statusBadge = screen.getByText("Approved");
    expect(statusBadge).toHaveClass("bg-green-100", "text-green-800");
  });

  it("should apply correct styling to rejected status badge", () => {
    const rejectedSubmission = {
      ...mockSubmission,
      review_status: "rejected",
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={rejectedSubmission}
      />,
    );

    const statusBadge = screen.getByText("Rejected");
    expect(statusBadge).toHaveClass("bg-red-100", "text-red-800");
  });

  it("should handle unknown organization gracefully", () => {
    const submissionWithUnknownOrg = {
      ...mockSubmission,
      org_name: null,
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={submissionWithUnknownOrg}
      />,
    );

    // Should fall back to submission ID
    expect(screen.getByText("sub-123")).toBeInTheDocument();
  });

  it("should handle empty organization name", () => {
    const submissionWithEmptyOrg = {
      ...mockSubmission,
      org_name: "",
    };

    render(
      <SubmissionInfo
        {...defaultProps}
        selectedSubmission={submissionWithEmptyOrg}
      />,
    );

    // Should fall back to submission ID
    expect(screen.getByText("sub-123")).toBeInTheDocument();
  });
});
