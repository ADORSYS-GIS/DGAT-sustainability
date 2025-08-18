import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubmissionsTable } from "../SubmissionsTable";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "reviewAssessments.submissionsUnderReview": "Submissions Under Review",
        "reviewAssessments.noSubmissionsUnderReview":
          "No submissions under review",
        "reviewAssessments.unknownOrganization": "Unknown Organization",
        "reviewAssessments.organization": "Organization",
        "reviewAssessments.submitted": "Submitted",
        "reviewAssessments.unknown": "Unknown",
        "reviewAssessments.review": "Review",
      };
      return translations[key] || key;
    },
  }),
}));

describe("SubmissionsTable", () => {
  const mockSubmissions = [
    {
      submission_id: "sub-1",
      org_name: "Test Organization 1",
      submitted_at: "2024-01-15T10:30:00Z",
      review_status: "pending",
      assessment_id: "assess-1",
      user_id: "user-1",
      responses: [],
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
    },
    {
      submission_id: "sub-2",
      org_name: "Test Organization 2",
      submitted_at: "2024-01-16T14:20:00Z",
      review_status: "approved",
      assessment_id: "assess-2",
      user_id: "user-2",
      responses: [],
      created_at: "2024-01-16T14:20:00Z",
      updated_at: "2024-01-16T14:20:00Z",
    },
  ];

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
    submissions: mockSubmissions,
    onReviewSubmission: vi.fn(),
    getStatusBadge: mockGetStatusBadge,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render submissions table card", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(
      screen.getByText("Submissions Under Review (2)"),
    ).toBeInTheDocument();
  });

  it("should display submission count in title", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(
      screen.getByText("Submissions Under Review (2)"),
    ).toBeInTheDocument();
  });

  it("should display all submissions", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    expect(screen.getByText("Test Organization 2")).toBeInTheDocument();
  });

  it("should display organization names", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    expect(screen.getByText("Test Organization 2")).toBeInTheDocument();
  });

  it("should display submission dates", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/16\/2024/)).toBeInTheDocument();
  });

  it("should display status badges", () => {
    render(<SubmissionsTable {...defaultProps} />);

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("should render review buttons for each submission", () => {
    render(<SubmissionsTable {...defaultProps} />);

    const reviewButtons = screen.getAllByText("Review");
    expect(reviewButtons).toHaveLength(2);
  });

  it("should call onReviewSubmission when review button is clicked", () => {
    render(<SubmissionsTable {...defaultProps} />);

    const reviewButtons = screen.getAllByText("Review");
    fireEvent.click(reviewButtons[0]);

    expect(defaultProps.onReviewSubmission).toHaveBeenCalledWith(
      mockSubmissions[0],
    );
  });

  it("should render file text icon in header", () => {
    render(<SubmissionsTable {...defaultProps} />);

    // The FileText icon should be present (it's rendered as an SVG)
    const fileIcons = document.querySelectorAll("svg");
    expect(fileIcons.length).toBeGreaterThan(0);
  });

  it("should render eye icons for review buttons", () => {
    render(<SubmissionsTable {...defaultProps} />);

    // The Eye icon should be present (it's rendered as an SVG)
    const eyeIcons = document.querySelectorAll("svg");
    expect(eyeIcons.length).toBeGreaterThan(0);
  });

  it("should display organization labels", () => {
    render(<SubmissionsTable {...defaultProps} />);

    const orgLabels = screen.getAllByText(/Organization:/);
    expect(orgLabels.length).toBeGreaterThan(0);
  });

  it("should display submitted labels", () => {
    render(<SubmissionsTable {...defaultProps} />);

    const submittedLabels = screen.getAllByText(/Submitted:/);
    expect(submittedLabels.length).toBeGreaterThan(0);
  });

  it("should show empty state when no submissions exist", () => {
    render(<SubmissionsTable {...defaultProps} submissions={[]} />);

    expect(screen.getByText("No submissions under review")).toBeInTheDocument();
    expect(
      screen.getByText("Submissions Under Review (0)"),
    ).toBeInTheDocument();
  });

  it("should handle unknown organization gracefully", () => {
    const submissionsWithUnknownOrg = [
      {
        ...mockSubmissions[0],
        org_name: null,
      },
    ];

    render(
      <SubmissionsTable
        {...defaultProps}
        submissions={submissionsWithUnknownOrg}
      />,
    );

    expect(screen.getByText("Unknown Organization")).toBeInTheDocument();
  });

  it("should handle unknown submission date gracefully", () => {
    const submissionsWithUnknownDate = [
      {
        ...mockSubmissions[0],
        submitted_at: null,
      },
    ];

    render(
      <SubmissionsTable
        {...defaultProps}
        submissions={submissionsWithUnknownDate}
      />,
    );

    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });

  it("should apply correct styling to status badges", () => {
    render(<SubmissionsTable {...defaultProps} />);

    const pendingBadge = screen.getByText("Pending Review");
    const approvedBadge = screen.getByText("Approved");

    expect(pendingBadge).toHaveClass("bg-yellow-100", "text-yellow-800");
    expect(approvedBadge).toHaveClass("bg-green-100", "text-green-800");
  });

  it("should display submission count correctly for single submission", () => {
    render(
      <SubmissionsTable {...defaultProps} submissions={[mockSubmissions[0]]} />,
    );

    expect(
      screen.getByText("Submissions Under Review (1)"),
    ).toBeInTheDocument();
  });
});
