import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionHeader } from "../QuestionHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageQuestions.title": "Manage Questions",
        "manageQuestions.subtitle":
          "Create and manage questions for sustainability assessments",
      })[key] || key,
  }),
}));

describe("QuestionHeader", () => {
  it("should render header with title and subtitle", () => {
    render(<QuestionHeader />);

    expect(screen.getByText("Manage Questions")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create and manage questions for sustainability assessments",
      ),
    ).toBeInTheDocument();
  });

  it("should render book icon", () => {
    render(<QuestionHeader />);

    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
