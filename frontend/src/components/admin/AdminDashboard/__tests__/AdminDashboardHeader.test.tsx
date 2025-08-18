import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminDashboardHeader } from "../AdminDashboardHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "adminDashboard.welcome": "Admin Dashboard",
        "adminDashboard.intro": "Welcome to the admin dashboard",
      })[key] || key,
  }),
}));

describe("AdminDashboardHeader", () => {
  it("should render header with welcome message and intro text", () => {
    render(<AdminDashboardHeader />);

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Welcome to the admin dashboard"),
    ).toBeInTheDocument();
  });

  it("should render settings icon", () => {
    render(<AdminDashboardHeader />);

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
