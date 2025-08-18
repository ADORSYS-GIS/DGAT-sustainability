import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
  const mockError = new Error("Test error message");
  const defaultProps = {
    error: mockError,
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error state container", () => {
    render(<ErrorState {...defaultProps} />);

    const container = document.querySelector(".container.mx-auto.p-6");
    expect(container).toBeInTheDocument();
  });

  it("should display error message", () => {
    render(<ErrorState {...defaultProps} />);

    expect(screen.getByText("Error loading submissions")).toBeInTheDocument();
  });

  it("should render retry button", () => {
    render(<ErrorState {...defaultProps} />);

    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", () => {
    render(<ErrorState {...defaultProps} />);

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    expect(defaultProps.onRetry).toHaveBeenCalled();
  });

  it("should render alert triangle icon", () => {
    render(<ErrorState {...defaultProps} />);

    // The AlertTriangle icon should be present (it's rendered as an SVG)
    const alertIcons = document.querySelectorAll("svg");
    expect(alertIcons.length).toBeGreaterThan(0);
  });

  it("should apply correct styling to error message", () => {
    render(<ErrorState {...defaultProps} />);

    const errorMessage = screen.getByText("Error loading submissions");
    expect(errorMessage).toHaveClass("text-red-600");
  });

  it("should apply correct styling to alert icon", () => {
    render(<ErrorState {...defaultProps} />);

    const alertIcon = document.querySelector(".h-8.w-8.text-red-500");
    expect(alertIcon).toBeInTheDocument();
  });

  it("should center content vertically and horizontally", () => {
    render(<ErrorState {...defaultProps} />);

    const centerContainer = document.querySelector(
      ".flex.items-center.justify-center.h-64",
    );
    expect(centerContainer).toBeInTheDocument();
  });

  it("should handle null error gracefully", () => {
    render(<ErrorState {...defaultProps} error={null} />);

    expect(screen.getByText("Error loading submissions")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should handle undefined error gracefully", () => {
    render(<ErrorState {...defaultProps} error={undefined as any} />);

    expect(screen.getByText("Error loading submissions")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should have proper spacing between elements", () => {
    render(<ErrorState {...defaultProps} />);

    const alertIcon = document.querySelector(
      ".h-8.w-8.text-red-500.mx-auto.mb-2",
    );
    expect(alertIcon).toBeInTheDocument();

    const retryButton = screen.getByText("Retry");
    expect(retryButton).toHaveClass("mt-2");
  });
});
