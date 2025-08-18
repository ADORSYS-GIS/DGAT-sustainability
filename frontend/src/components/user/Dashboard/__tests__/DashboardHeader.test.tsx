import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "../DashboardHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "user.dashboard.welcome": `Welcome ${options?.user} from ${options?.org}`,
        "user.dashboard.readyToContinue":
          "Ready to continue your sustainability journey",
      };
      return translations[key] || key;
    },
  }),
}));

describe("DashboardHeader", () => {
  const defaultProps = {
    userName: "John Doe",
    orgName: "Test Organization",
  };

  it("renders welcome message with user and organization", () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(
      screen.getByText("Welcome John Doe from Test Organization"),
    ).toBeInTheDocument();
  });

  it("renders subtitle message", () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(
      screen.getByText("Ready to continue your sustainability journey"),
    ).toBeInTheDocument();
  });

  it("renders star icon", () => {
    render(<DashboardHeader {...defaultProps} />);

    const starIcon = document.querySelector(".lucide-star");
    expect(starIcon).toBeInTheDocument();
  });
});
