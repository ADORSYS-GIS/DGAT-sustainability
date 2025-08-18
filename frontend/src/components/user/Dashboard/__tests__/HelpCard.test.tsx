import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HelpCard } from "../HelpCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "user.dashboard.needHelp": "Need Help?",
        "user.dashboard.getSupport":
          "Get support and guidance for using the platform.",
        "user.dashboard.viewUserGuide": "View User Guide",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("HelpCard", () => {
  it("renders help title and description", () => {
    render(<HelpCard onViewGuide={vi.fn()} />);

    expect(screen.getByText("Need Help?")).toBeInTheDocument();
    expect(
      screen.getByText("Get support and guidance for using the platform."),
    ).toBeInTheDocument();
  });

  it("renders view user guide button", () => {
    render(<HelpCard onViewGuide={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /view user guide/i }),
    ).toBeInTheDocument();
  });

  it("calls onViewGuide when button is clicked", () => {
    const onViewGuide = vi.fn();
    render(<HelpCard onViewGuide={onViewGuide} />);

    fireEvent.click(screen.getByRole("button", { name: /view user guide/i }));
    expect(onViewGuide).toHaveBeenCalledTimes(1);
  });
});
