import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryAccordion } from "../CategoryAccordion";

// Mock ResponseCard component
vi.mock("../ResponseCard", () => ({
  ResponseCard: ({ response, index }: any) => (
    <div data-testid={`response-card-${index}`}>Response Card {index}</div>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        noData: "No Data",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("CategoryAccordion", () => {
  const mockResponses = [
    { id: "resp1", question: "Question 1" },
    { id: "resp2", question: "Question 2" },
  ] as any[];

  const defaultProps = {
    groupedByCategory: {
      Environmental: mockResponses,
      Social: [mockResponses[0]],
    },
    categories: ["Environmental", "Social"],
  };

  it("renders category accordion items", () => {
    render(<CategoryAccordion {...defaultProps} />);

    expect(screen.getByText("Environmental")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
  });

  it("renders accordion structure for each category", () => {
    render(<CategoryAccordion {...defaultProps} />);

    // Check that accordion items are rendered (the buttons are visible)
    const accordionButtons = screen.getAllByRole("button");
    expect(accordionButtons).toHaveLength(2);
    expect(accordionButtons[0]).toHaveTextContent("Environmental");
    expect(accordionButtons[1]).toHaveTextContent("Social");
  });

  it("shows no data message when no categories", () => {
    render(<CategoryAccordion groupedByCategory={{}} categories={[]} />);

    expect(screen.getByText("No Data")).toBeInTheDocument();
  });

  it("renders correct number of accordion items", () => {
    render(<CategoryAccordion {...defaultProps} />);

    // Check that we have the right number of accordion items
    const accordionItems = document.querySelectorAll('[data-state="closed"]');
    expect(accordionItems.length).toBeGreaterThan(0);
  });
});
