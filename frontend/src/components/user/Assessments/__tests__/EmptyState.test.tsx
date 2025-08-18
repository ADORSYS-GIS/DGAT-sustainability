import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        noSubmissions: "No Submissions",
        "dashboard.assessments.emptyState":
          "Start your first sustainability assessment to track your cooperative's progress.",
      };
      return translations[key] || key;
    },
  }),
}));

describe("EmptyState", () => {
  it("renders empty state message", () => {
    render(<EmptyState />);

    expect(screen.getByText("No Submissions")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<EmptyState />);

    expect(
      screen.getByText(
        "Start your first sustainability assessment to track your cooperative's progress.",
      ),
    ).toBeInTheDocument();
  });

  it("renders file text icon", () => {
    render(<EmptyState />);

    const fileIcon = document.querySelector(".lucide-file-text");
    expect(fileIcon).toBeInTheDocument();
  });
});
