import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserHeader } from "../UserHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageUsers.title": "Manage Users",
        "manageUsers.subtitle": "Create and manage users for organizations",
      })[key] || key,
  }),
}));

describe("UserHeader", () => {
  it("should render header with title and subtitle", () => {
    render(<UserHeader />);

    expect(screen.getByText("Manage Users")).toBeInTheDocument();
    expect(
      screen.getByText("Create and manage users for organizations"),
    ).toBeInTheDocument();
  });

  it("should render users icon", () => {
    render(<UserHeader />);

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
