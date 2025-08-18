import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Assessments } from "../Assessments";

vi.mock("@/hooks/user/useAssessments", () => ({
  useAssessments: () => ({
    isLoading: false,
    isDeleting: false,
    submissions: [],
    user: { id: "u1" },
    getCategoryCounts: vi.fn(),
    isOrgAdmin: vi.fn(() => false),
    handleDeleteSubmission: vi.fn(),
    handleManualSync: vi.fn(),
    handleViewSubmission: vi.fn(),
  }),
}));

vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/user/Assessments", () => ({
  AssessmentsHeader: () => <div data-testid="assessments-header">Header</div>,
  SubmissionCard: () => <div data-testid="submission-card">Card</div>,
  EmptyState: () => <div data-testid="empty-state">Empty</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("User Assessments Page", () => {
  it("renders navbar and header", () => {
    render(<Assessments />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("assessments-header")).toBeInTheDocument();
  });
});
