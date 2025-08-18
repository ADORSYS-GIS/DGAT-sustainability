import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminGuide } from "../AdminGuide";

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
        "adminDashboard.adminGuide": "Admin Guide",
        "adminDashboard.guideIntro": "Complete guide for administrators",
        "adminDashboard.guideOrgsUsers": "Manage organizations and users",
        "adminDashboard.guideReview": "Review and approve assessments",
        "adminDashboard.guideCategoriesQuestions":
          "Manage categories and questions",
        "adminDashboard.guideDocs": "Access documentation",
        "adminDashboard.guideSupport": "Get support",
        "adminDashboard.viewCompleteGuide": "View Complete Guide",
      })[key] || key,
  }),
}));

describe("AdminGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render guide card with title and content", () => {
    render(<AdminGuide />);

    expect(screen.getByText("Admin Guide")).toBeInTheDocument();
    expect(
      screen.getByText("Complete guide for administrators"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage organizations and users"),
    ).toBeInTheDocument();
    expect(screen.getByText("View Complete Guide")).toBeInTheDocument();
  });

  it("should navigate to guide page when card is clicked", () => {
    render(<AdminGuide />);

    const card = screen.getByText("Admin Guide").closest(".cursor-pointer");
    fireEvent.click(card!);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/guide");
  });

  it("should navigate to guide page when button is clicked", () => {
    render(<AdminGuide />);

    const button = screen.getByText("View Complete Guide");
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/guide");
  });
});
