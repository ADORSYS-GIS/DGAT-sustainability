import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorState } from "../ErrorState";

// Mock Navbar component
vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

describe("ErrorState", () => {
  it("renders error message", () => {
    render(<ErrorState />);

    expect(
      screen.getByText("Error loading submission details."),
    ).toBeInTheDocument();
  });

  it("renders navbar", () => {
    render(<ErrorState />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
  });

  it("has proper styling classes", () => {
    const { container } = render(<ErrorState />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass("min-h-screen", "bg-gray-50");

    const errorText = screen.getByText("Error loading submission details.");
    expect(errorText).toHaveClass("text-red-600");
  });
});
