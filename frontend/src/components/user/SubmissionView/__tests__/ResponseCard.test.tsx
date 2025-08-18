import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponseCard } from "../ResponseCard";

// Mock ResponseDisplay component
vi.mock("../ResponseDisplay", () => ({
  ResponseDisplay: ({ response }: any) => (
    <div data-testid="response-display">Response Display</div>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        category: "Category",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("ResponseCard", () => {
  const mockResponse = {
    id: "resp1",
    question: { en: "What is your environmental impact?" },
    answer: "We have reduced our carbon footprint by 20%",
  } as any;

  it("renders question text from multilingual object", () => {
    render(<ResponseCard response={mockResponse} index={0} />);

    expect(
      screen.getByText("What is your environmental impact?"),
    ).toBeInTheDocument();
  });

  it("renders question text from string", () => {
    const responseWithStringQuestion = {
      ...mockResponse,
      question: "Simple question text",
    };

    render(<ResponseCard response={responseWithStringQuestion} index={0} />);

    expect(screen.getByText("Simple question text")).toBeInTheDocument();
  });

  it("renders fallback text when question is invalid", () => {
    const responseWithInvalidQuestion = {
      ...mockResponse,
      question: null,
    };

    render(<ResponseCard response={responseWithInvalidQuestion} index={0} />);

    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("renders ResponseDisplay component", () => {
    render(<ResponseCard response={mockResponse} index={0} />);

    expect(screen.getByTestId("response-display")).toBeInTheDocument();
  });
});
