import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssessmentList } from "../AssessmentList";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/shared/useAuth", () => ({
  useAuth: () => ({
    user: { organizations: { org1: { id: "org1", categories: [] } } },
  }),
}));

vi.mock("../../hooks/useOfflineApi", () => ({
  useOfflineDraftAssessments: () => ({
    data: { assessments: [] },
    isLoading: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/shared/AssessmentList", () => ({
  AssessmentList: () => <div data-testid="assessment-list">AssessmentList</div>,
}));

describe("User AssessmentList Page", () => {
  it("renders navbar and heading", () => {
    render(<AssessmentList />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(
      screen.getByText("assessment.selectAssessmentToAnswer"),
    ).toBeInTheDocument();
  });
});
