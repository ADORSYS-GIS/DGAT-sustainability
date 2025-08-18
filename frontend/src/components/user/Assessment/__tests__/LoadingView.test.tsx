import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingView } from "../LoadingView";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        loading: "Loading...",
        "assessment.creating": "Creating assessment...",
        "assessment.pleaseWait": "Please wait while we set up your assessment.",
        "assessment.attempt": "Attempt",
      };
      return translations[key] || key;
    },
  }),
}));

describe("LoadingView", () => {
  it("renders loading state by default", () => {
    render(<LoadingView />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders creating assessment message when isCreating is true", () => {
    render(<LoadingView isCreating={true} />);

    expect(screen.getByText("Creating assessment...")).toBeInTheDocument();
    expect(
      screen.getByText("Please wait while we set up your assessment."),
    ).toBeInTheDocument();
  });

  it("shows attempt count when creating and attempts > 0", () => {
    render(<LoadingView isCreating={true} creationAttempts={2} />);

    expect(screen.getByText("Attempt 2/3")).toBeInTheDocument();
  });

  it("does not show attempt count when not creating", () => {
    render(<LoadingView isCreating={false} creationAttempts={2} />);

    expect(screen.queryByText(/Attempt/)).not.toBeInTheDocument();
  });

  it("renders loading spinner", () => {
    render(<LoadingView />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
