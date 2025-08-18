import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewHeader } from "../ReviewHeader";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "reviewAssessments.backToDashboard": "Back to Dashboard",
        "reviewAssessments.title": "Review Assessments",
        "reviewAssessments.subtitle":
          "Review and approve submitted assessments",
      })[key] || key,
  }),
}));

describe("ReviewHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render header with title and subtitle", () => {
    render(<ReviewHeader />);

    expect(screen.getByText("Review Assessments")).toBeInTheDocument();
    expect(
      screen.getByText("Review and approve submitted assessments"),
    ).toBeInTheDocument();
  });

  it("should render back to dashboard button", () => {
    render(<ReviewHeader />);

    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  it("should navigate to admin dashboard when back button is clicked", () => {
    render(<ReviewHeader />);

    const backButton = screen.getByText("Back to Dashboard");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("should render arrow left icon", () => {
    render(<ReviewHeader />);

    const icons = document.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });
});
