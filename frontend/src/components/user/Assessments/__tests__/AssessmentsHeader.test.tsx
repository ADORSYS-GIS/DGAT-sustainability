import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssessmentsHeader } from "../AssessmentsHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        yourSubmissions: "Your Submissions",
        "dashboard.assessments.subtitle":
          "View and manage all your sustainability submissions",
        syncData: "Sync Data",
      };
      return translations[key] || key;
    },
  }),
}));

describe("AssessmentsHeader", () => {
  const defaultProps = {
    onManualSync: vi.fn(),
  };

  it("renders title and subtitle", () => {
    render(<AssessmentsHeader {...defaultProps} />);

    expect(screen.getByText("Your Submissions")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage all your sustainability submissions"),
    ).toBeInTheDocument();
  });

  it("renders sync button", () => {
    render(<AssessmentsHeader {...defaultProps} />);

    const syncButton = screen.getByRole("button", { name: /sync data/i });
    expect(syncButton).toBeInTheDocument();
  });

  it("calls onManualSync when sync button is clicked", () => {
    const mockOnManualSync = vi.fn();
    render(<AssessmentsHeader onManualSync={mockOnManualSync} />);

    const syncButton = screen.getByRole("button", { name: /sync data/i });
    fireEvent.click(syncButton);

    expect(mockOnManualSync).toHaveBeenCalledTimes(1);
  });

  it("renders file text icon", () => {
    render(<AssessmentsHeader {...defaultProps} />);

    const fileIcon = document.querySelector(".lucide-file-text");
    expect(fileIcon).toBeInTheDocument();
  });
});
