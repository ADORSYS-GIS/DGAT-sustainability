import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryHeader } from "../CategoryHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageCategories.title": "Manage Categories",
        "manageCategories.configureCategories":
          "Configure and organize assessment categories",
      })[key] || key,
  }),
}));

describe("CategoryHeader", () => {
  it("should render header with title and description", () => {
    render(<CategoryHeader />);

    expect(screen.getByText("Manage Categories")).toBeInTheDocument();
    expect(
      screen.getByText("Configure and organize assessment categories"),
    ).toBeInTheDocument();
  });

  it("should render list icon", () => {
    render(<CategoryHeader />);

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
