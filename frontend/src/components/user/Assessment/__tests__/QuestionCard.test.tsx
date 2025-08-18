import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionCard } from "../QuestionCard";

// Mock QuestionInput component
vi.mock("../QuestionInput", () => ({
  QuestionInput: ({ questionId }: { questionId: string }) => (
    <div data-testid={`question-input-${questionId}`}>Question Input</div>
  ),
}));

describe("QuestionCard", () => {
  const mockQuestions = [
    {
      question: {
        question_id: "q1",
        category: "environmental",
        created_at: "2024-01-01T00:00:00Z",
      },
      revision: {
        question_revision_id: "qr1",
        question_id: "q1",
        text: { en: "What is your environmental impact?" },
        weight: 5,
        created_at: "2024-01-01T00:00:00Z",
      },
    },
  ];

  const defaultProps = {
    currentCategory: "Environmental",
    currentQuestions: mockQuestions,
    answers: {},
    onAnswerChange: vi.fn(),
    onFileUpload: vi.fn(),
    showPercentInfo: false,
    setShowPercentInfo: vi.fn(),
    getRevisionKey: (revision: any) => revision.question_revision_id,
    currentLanguage: "en",
  };

  it("renders category title", () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByText("Environmental")).toBeInTheDocument();
  });

  it("renders question text", () => {
    render(<QuestionCard {...defaultProps} />);

    expect(
      screen.getByText("1. What is your environmental impact?"),
    ).toBeInTheDocument();
  });

  it("renders QuestionInput for each question", () => {
    render(<QuestionCard {...defaultProps} />);

    expect(screen.getByTestId("question-input-qr1")).toBeInTheDocument();
  });

  it("handles multiple questions", () => {
    const multipleQuestions = [
      ...mockQuestions,
      {
        question: {
          question_id: "q2",
          category: "environmental",
          created_at: "2024-01-01T00:00:00Z",
        },
        revision: {
          question_revision_id: "qr2",
          question_id: "q2",
          text: { en: "How do you manage waste?" },
          weight: 3,
          created_at: "2024-01-01T00:00:00Z",
        },
      },
    ];

    render(
      <QuestionCard {...defaultProps} currentQuestions={multipleQuestions} />,
    );

    expect(
      screen.getByText("1. What is your environmental impact?"),
    ).toBeInTheDocument();
    expect(screen.getByText("2. How do you manage waste?")).toBeInTheDocument();
    expect(screen.getByTestId("question-input-qr1")).toBeInTheDocument();
    expect(screen.getByTestId("question-input-qr2")).toBeInTheDocument();
  });
});
