import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineStatusIndicator } from "../OfflineStatusIndicator";

describe("OfflineStatusIndicator", () => {
  it("should show online status when isOnline is true", () => {
    render(<OfflineStatusIndicator isOnline={true} />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Online").closest("div")).toHaveClass(
      "bg-green-100",
      "text-green-800",
    );
  });

  it("should show offline status when isOnline is false", () => {
    render(<OfflineStatusIndicator isOnline={false} />);

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Offline").closest("div")).toHaveClass(
      "bg-yellow-100",
      "text-yellow-800",
    );
  });

  it("should have correct status indicator dot color", () => {
    const { rerender } = render(<OfflineStatusIndicator isOnline={true} />);

    let dot = document.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toHaveClass("bg-green-500");

    rerender(<OfflineStatusIndicator isOnline={false} />);
    dot = document.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toHaveClass("bg-yellow-500");
  });
});
