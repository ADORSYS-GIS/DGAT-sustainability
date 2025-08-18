import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SystemStats } from "../SystemStats";

describe("SystemStats", () => {
  const mockStats = [
    { label: "Total Users", value: 150, color: "blue", loading: false },
    { label: "Active Assessments", value: 25, color: "green", loading: false },
    { label: "Pending Reviews", value: 8, color: "orange", loading: true },
    {
      label: "Total Organizations",
      value: 12,
      color: "purple",
      loading: false,
    },
  ];

  it("should render all stat cards with values", () => {
    render(<SystemStats stats={mockStats} />);

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Active Assessments")).toBeInTheDocument();
    expect(screen.getByText("Total Organizations")).toBeInTheDocument();
  });

  it("should show loading spinner for loading stats", () => {
    render(<SystemStats stats={mockStats} />);

    const loadingSpinner = document.querySelector(".animate-spin");
    expect(loadingSpinner).toBeInTheDocument();
  });

  it("should not show value for loading stats", () => {
    render(<SystemStats stats={mockStats} />);

    expect(screen.queryByText("8")).not.toBeInTheDocument();
  });
});
