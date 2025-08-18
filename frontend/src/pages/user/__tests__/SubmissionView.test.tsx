import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmissionView } from "../SubmissionView";

vi.mock("@/hooks/user/useSubmissionView", () => ({
  useSubmissionView: () => ({
    submissionLoading: false,
    submissionError: null,
    submission: {
      id: "s1",
      review_status: "approved",
      submitted_at: "2024-01-01T00:00:00Z",
    },
    groupedByCategory: { Environmental: [] },
    categories: ["Environmental"],
  }),
}));

vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/user/SubmissionView", () => ({
  SubmissionHeader: () => <div data-testid="submission-header">Header</div>,
  CategoryAccordion: () => (
    <div data-testid="category-accordion">Accordion</div>
  ),
  ErrorState: () => <div data-testid="error-state">Error</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("User SubmissionView Page", () => {
  it("renders navbar, header, and accordion", () => {
    render(<SubmissionView />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("submission-header")).toBeInTheDocument();
    expect(screen.getByTestId("category-accordion")).toBeInTheDocument();
  });
});
