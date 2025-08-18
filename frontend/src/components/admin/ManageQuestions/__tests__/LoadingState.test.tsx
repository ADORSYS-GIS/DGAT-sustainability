import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LoadingState } from "@/components/shared";

describe("LoadingState", () => {
  it("should render loading spinner", () => {
    render(<LoadingState />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should have correct styling classes", () => {
    render(<LoadingState />);

    const container = document.querySelector(".min-h-screen.bg-gray-50");
    expect(container).toBeInTheDocument();

    const spinner = document.querySelector(
      ".animate-spin.rounded-full.border-2.border-gray-300.border-t-dgrv-blue",
    );
    expect(spinner).toBeInTheDocument();
  });
});
