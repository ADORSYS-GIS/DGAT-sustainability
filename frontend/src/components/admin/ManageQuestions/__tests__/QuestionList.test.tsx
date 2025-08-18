import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionList } from "../QuestionList";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "manageQuestions.noText": "No text available",
        "manageQuestions.noQuestionsInCategory":
          "No questions in this category yet",
        "manageQuestions.noCategories": "No categories available",
        "languages.en": "English",
        "languages.ss": "siSwati",
        "languages.pt": "Português",
        "languages.zu": "isiZulu",
        "languages.de": "Deutsch",
        "languages.fr": "Français",
      };
      return translations[key] || key;
    },
  }),
}));

describe("QuestionList", () => {
  const mockCategories = [
    {
      category_id: "1",
      name: "Environmental Impact",
      weight: 40,
      order: 1,
      template_id: "t1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      category_id: "2",
      name: "Social Responsibility",
      weight: 30,
      order: 2,
      template_id: "t1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  const mockQuestions = [
    {
      question_id: "1",
      category: "Environmental Impact",
      created_at: "2024-01-01",
      latest_revision: {
        question_revision_id: "1",
        question_id: "1",
        text: {
          en: "What is your company's carbon footprint?",
          ss: "I-carbon footprint yekhampani yakho iyini?",
        },
        weight: 5,
        created_at: "2024-01-01",
      },
    },
    {
      question_id: "2",
      category: "Environmental Impact",
      created_at: "2024-01-01",
      latest_revision: {
        question_revision_id: "2",
        question_id: "2",
        text: {
          en: "How do you manage waste disposal?",
          pt: "Como você gerencia o descarte de resíduos?",
        },
        weight: 3,
        created_at: "2024-01-01",
      },
    },
    {
      question_id: "3",
      category: "Social Responsibility",
      created_at: "2024-01-01",
      latest_revision: {
        question_revision_id: "3",
        question_id: "3",
        text: {
          en: "What community programs do you support?",
        },
        weight: 4,
        created_at: "2024-01-01",
      },
    },
  ];

  const defaultProps = {
    questions: mockQuestions,
    categories: mockCategories,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all categories as accordion items", () => {
    render(<QuestionList {...defaultProps} />);

    expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
    expect(screen.getByText("Social Responsibility")).toBeInTheDocument();
  });

  it("should show question count for each category", () => {
    render(<QuestionList {...defaultProps} />);

    expect(screen.getByText("2 questions")).toBeInTheDocument();
    expect(screen.getByText("1 question")).toBeInTheDocument();
  });

  it("should display questions when category is expanded", () => {
    render(<QuestionList {...defaultProps} />);

    // Click on the first category to expand it
    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    expect(
      screen.getByText("What is your company's carbon footprint?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("How do you manage waste disposal?"),
    ).toBeInTheDocument();
  });

  it("should display question weights", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    expect(screen.getByText("Weight: 5")).toBeInTheDocument();
    expect(screen.getByText("Weight: 3")).toBeInTheDocument();
  });

  it("should display multilingual text correctly", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    expect(
      screen.getByText("What is your company's carbon footprint?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("I-carbon footprint yekhampani yakho iyini?"),
    ).toBeInTheDocument();
  });

  it("should call onEdit when edit button is clicked", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockQuestions[0]);
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith("1");
  });

  it("should show empty state when category has no questions", () => {
    const emptyCategoryQuestions = mockQuestions.filter(
      (q) => q.category !== "Social Responsibility",
    );

    render(
      <QuestionList {...defaultProps} questions={emptyCategoryQuestions} />,
    );

    const secondCategory = screen.getByText("Social Responsibility");
    fireEvent.click(secondCategory);

    expect(screen.getByText("No Questions Yet")).toBeInTheDocument();
    expect(
      screen.getByText("No questions in this category yet"),
    ).toBeInTheDocument();
  });

  it("should show no categories message when no categories exist", () => {
    render(<QuestionList {...defaultProps} categories={[]} />);

    expect(screen.getByText("No Categories Available")).toBeInTheDocument();
    expect(screen.getByText("No categories available")).toBeInTheDocument();
  });

  it("should display question numbers correctly", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    // Check that question numbers are displayed (1, 2)
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should handle questions with no text gracefully", () => {
    const questionsWithNoText = [
      {
        question_id: "4",
        category: "Environmental Impact",
        created_at: "2024-01-01",
        latest_revision: {
          question_revision_id: "4",
          question_id: "4",
          text: {},
          weight: 1,
          created_at: "2024-01-01",
        },
      },
    ];

    render(<QuestionList {...defaultProps} questions={questionsWithNoText} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    expect(screen.getByText("No text available")).toBeInTheDocument();
  });

  it("should prioritize English text in display order", () => {
    render(<QuestionList {...defaultProps} />);

    const firstCategory = screen.getByText("Environmental Impact");
    fireEvent.click(firstCategory);

    // English text should appear first (it has a blue background)
    const englishText = screen.getByText(
      "What is your company's carbon footprint?",
    );
    expect(englishText).toBeInTheDocument();

    // Check for the "Primary" badges on English text (there should be multiple)
    const primaryBadges = screen.getAllByText("Primary");
    expect(primaryBadges.length).toBeGreaterThan(0);
  });
});
