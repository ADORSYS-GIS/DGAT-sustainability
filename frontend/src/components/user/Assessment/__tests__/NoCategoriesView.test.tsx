import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoCategoriesView } from "../NoCategoriesView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "assessment.noCategoriesTitle": "No Categories Available",
        "assessment.noCategoriesDescription":
          "No assessment categories have been assigned to your account. Please contact your organization administrator.",
        "assessment.backToDashboard": "Back to Dashboard",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("NoCategoriesView", () => {
  it("renders no categories message", () => {
    render(<NoCategoriesView onBackToDashboard={vi.fn()} />);

    expect(screen.getByText("No Categories Available")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No assessment categories have been assigned to your account. Please contact your organization administrator.",
      ),
    ).toBeInTheDocument();
  });

  it("renders back to dashboard button", () => {
    render(<NoCategoriesView onBackToDashboard={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();
  });

  it("calls onBackToDashboard when button is clicked", () => {
    const onBackToDashboard = vi.fn();
    render(<NoCategoriesView onBackToDashboard={onBackToDashboard} />);

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(onBackToDashboard).toHaveBeenCalledTimes(1);
  });

  it("renders file text icon", () => {
    render(<NoCategoriesView onBackToDashboard={vi.fn()} />);

    const icon = document.querySelector(".lucide-file-text");
    expect(icon).toBeInTheDocument();
  });
});
