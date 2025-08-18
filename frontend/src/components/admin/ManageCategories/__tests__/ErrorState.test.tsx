import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "../ErrorState";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageCategories.loadError": "Error Loading Categories",
        "manageCategories.unknownError": "An unknown error occurred",
        "manageCategories.retry": "Retry",
      })[key] || key,
  }),
}));

describe("ErrorState", () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error message and retry button", () => {
    const error = new Error("Failed to load categories");
    render(<ErrorState error={error} onRetry={mockOnRetry} />);

    expect(screen.getByText("Error Loading Categories")).toBeInTheDocument();
    expect(screen.getByText("Failed to load categories")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should show unknown error when error is null", () => {
    render(<ErrorState error={null} onRetry={mockOnRetry} />);

    expect(screen.getByText("An unknown error occurred")).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", () => {
    const error = new Error("Test error");
    render(<ErrorState error={error} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });
});
