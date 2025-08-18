import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssessmentHeader } from "../AssessmentHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        category: "Category",
        of: "of",
        progress: "Progress",
      };
      return translations[key] || key;
    },
  }),
}));

describe("AssessmentHeader", () => {
  const defaultProps = {
    toolName: "Sustainability Assessment",
    currentCategoryIndex: 0,
    categoriesLength: 3,
    currentCategory: "Environmental",
    progress: 33.33,
  };

  it("renders tool name and category information", () => {
    render(<AssessmentHeader {...defaultProps} />);

    expect(screen.getByText("Sustainability Assessment")).toBeInTheDocument();

    const categoryElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes("Category 1 of 3");
    });
    expect(categoryElements.length).toBeGreaterThan(0);

    const environmentalElements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes("Environmental");
    });
    expect(environmentalElements.length).toBeGreaterThan(0);
  });

  it("displays progress information", () => {
    render(<AssessmentHeader {...defaultProps} />);

    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders progress bar", () => {
    render(<AssessmentHeader {...defaultProps} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });
});
