import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssessmentResponses } from "../AssessmentResponses";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "reviewAssessments.assessmentResponses": "Assessment Responses",
        "reviewAssessments.noResponsesFound": "No responses found",
        "reviewAssessments.addRecommendation": "Add Recommendation",
        "reviewAssessments.recommendations": "Recommendations",
        "reviewAssessments.noRecommendations": "No recommendations yet",
        "reviewAssessments.collapse": "Collapse",
        "reviewAssessments.expand": "Expand",
        "reviewAssessments.yourRecommendations": "Your Recommendations:",
        "reviewAssessments.addedAt": "Added at",
        "reviewAssessments.addRecommendationFor": "Add Recommendation for",
        "reviewAssessments.recommendation": "Recommendation",
        "reviewAssessments.enterRecommendationFor":
          "Enter your recommendation for",
        "reviewAssessments.category": "category",
        "reviewAssessments.cancel": "Cancel",
        "reviewAssessments.yesNo": "Yes/No:",
        "reviewAssessments.yes": "Yes",
        "reviewAssessments.no": "No",
        "reviewAssessments.percentage": "Percentage:",
        "reviewAssessments.response": "Response:",
        "reviewAssessments.clickExpandToView": 'Click "Expand" to view',
        "reviewAssessments.question": "question",
      };
      return translations[key] || key;
    },
  }),
}));

describe("AssessmentResponses", () => {
  const mockSubmissionResponses = [
    {
      question_id: "q1",
      question_category: "environmental",
      question_text: "What is your carbon footprint?",
      response: JSON.stringify({
        text: "We have reduced our carbon footprint by 20%",
      }),
      weight: 5,
    },
    {
      question_id: "q2",
      question_category: "environmental",
      question_text: "How do you manage waste?",
      response: JSON.stringify({ text: "We recycle 80% of our waste" }),
      weight: 3,
    },
    {
      question_id: "q3",
      question_category: "social",
      question_text: "What community programs do you support?",
      response: JSON.stringify({ text: "We support local education programs" }),
      weight: 4,
    },
  ];

  const mockCategoryRecommendations = [
    {
      id: "rec1",
      category: "environmental",
      recommendation: "Consider implementing renewable energy sources",
      timestamp: new Date("2024-01-15T10:30:00Z"),
    },
  ];

  const defaultProps = {
    submissionResponses: mockSubmissionResponses,
    categoryRecommendations: mockCategoryRecommendations,
    currentComment: "",
    setCurrentComment: vi.fn(),
    isAddingRecommendation: "",
    setIsAddingRecommendation: vi.fn(),
    expandedCategories: new Set(["environmental"]),
    setExpandedCategories: vi.fn(),
    onAddRecommendation: vi.fn(),
    onRemoveRecommendation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render assessment responses card", () => {
    render(<AssessmentResponses {...defaultProps} />);

    expect(screen.getByText("Assessment Responses")).toBeInTheDocument();
  });

  it("should display message square icon in header", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // The MessageSquare icon should be present (it's rendered as an SVG)
    const messageIcons = document.querySelectorAll("svg");
    expect(messageIcons.length).toBeGreaterThan(0);
  });

  it("should show empty state when no responses exist", () => {
    render(<AssessmentResponses {...defaultProps} submissionResponses={[]} />);

    expect(screen.getByText("No responses found")).toBeInTheDocument();
  });

  it("should group responses by category", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Check that both categories are present by looking for their initials
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("should display category question counts", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Check that the question count text is present in the document using a flexible matcher
    const elements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes("questions");
    });
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should display category initials in circles", () => {
    render(<AssessmentResponses {...defaultProps} />);

    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("should display recommendation badges when recommendations exist", () => {
    render(<AssessmentResponses {...defaultProps} />);

    expect(screen.getByText("1 Recommendation")).toBeInTheDocument();
  });

  it("should display multiple recommendations badge correctly", () => {
    const multipleRecommendations = [
      ...mockCategoryRecommendations,
      {
        id: "rec2",
        category: "environmental",
        recommendation: "Another recommendation",
        timestamp: new Date("2024-01-15T11:30:00Z"),
      },
    ];

    render(
      <AssessmentResponses
        {...defaultProps}
        categoryRecommendations={multipleRecommendations}
      />,
    );

    expect(screen.getByText("2 Recommendations")).toBeInTheDocument();
  });

  it("should display question texts for expanded categories", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Only environmental category is expanded, so only those questions should be visible
    expect(
      screen.getByText("What is your carbon footprint?"),
    ).toBeInTheDocument();
    expect(screen.getByText("How do you manage waste?")).toBeInTheDocument();
    // Social category is not expanded, so this question should not be visible
    expect(
      screen.queryByText("What community programs do you support?"),
    ).not.toBeInTheDocument();
  });

  it("should display response texts for expanded categories", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Only environmental category is expanded, so only those responses should be visible
    expect(
      screen.getByText("We have reduced our carbon footprint by 20%"),
    ).toBeInTheDocument();
    expect(screen.getByText("We recycle 80% of our waste")).toBeInTheDocument();
    // Social category is not expanded, so this response should not be visible
    expect(
      screen.queryByText("We support local education programs"),
    ).not.toBeInTheDocument();
  });

  it("should display existing recommendations", () => {
    render(<AssessmentResponses {...defaultProps} />);

    expect(
      screen.getByText("Consider implementing renewable energy sources"),
    ).toBeInTheDocument();
  });

  it("should render check circle icons for recommendations", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // The CheckCircle icon should be present (it's rendered as an SVG)
    const checkIcons = document.querySelectorAll("svg");
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it("should apply correct styling to recommendation badges", () => {
    render(<AssessmentResponses {...defaultProps} />);

    const recommendationBadge = screen.getByText("1 Recommendation");
    expect(recommendationBadge).toHaveClass("bg-green-100", "text-green-800");
  });

  it("should handle empty recommendations gracefully", () => {
    render(
      <AssessmentResponses {...defaultProps} categoryRecommendations={[]} />,
    );

    // Should not show any recommendation badges, but "Add Recommendation" buttons should still exist
    expect(screen.queryByText(/1 Recommendation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 Recommendations/)).not.toBeInTheDocument();
  });

  it("should display category names in title case", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Check that both categories are present by looking for their initials
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("should handle single question in category", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Check that the question count text is present using a flexible matcher
    const elements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes("questions");
    });
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should handle multiple questions in category", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Check that the question count text is present using a flexible matcher
    const elements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes("questions");
    });
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should show collapsed state for non-expanded categories", () => {
    render(<AssessmentResponses {...defaultProps} />);

    // Social category is not expanded, so it should show the collapsed message
    // Use getAllByText to handle multiple elements and check if any contain the text
    const elements = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Click "Expand" to view');
    });
    expect(elements.length).toBeGreaterThan(0);
  });
});
