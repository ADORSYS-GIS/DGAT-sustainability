import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionInput } from "../QuestionInput";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "assessment.yesNo": "Yes/No",
        "assessment.percentage": "Percentage",
        "assessment.percentNotStarted": "Not started",
        "assessment.percentSomeProgress": "Some progress",
        "assessment.percentHalfway": "Halfway",
        "assessment.percentAlmostDone": "Almost done",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("QuestionInput", () => {
  const defaultProps = {
    questionId: "q1",
    answer: {},
    onAnswerChange: vi.fn(),
    onFileUpload: vi.fn(),
    showPercentInfo: false,
    setShowPercentInfo: vi.fn(),
  };

  it("renders yes/no buttons", () => {
    render(<QuestionInput {...defaultProps} />);

    expect(screen.getByText("Yes/No")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("calls onAnswerChange when yes/no buttons are clicked", () => {
    const onAnswerChange = vi.fn();
    render(<QuestionInput {...defaultProps} onAnswerChange={onAnswerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onAnswerChange).toHaveBeenCalledWith("q1", { yesNo: true });

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onAnswerChange).toHaveBeenCalledWith("q1", { yesNo: false });
  });

  it("renders percentage label and info button", () => {
    render(<QuestionInput {...defaultProps} />);

    expect(screen.getByText("Percentage")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show percentage explanation/i }),
    ).toBeInTheDocument();
  });

  it("calls setShowPercentInfo when info button is clicked", () => {
    const setShowPercentInfo = vi.fn();
    render(
      <QuestionInput
        {...defaultProps}
        setShowPercentInfo={setShowPercentInfo}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /show percentage explanation/i }),
    );
    expect(setShowPercentInfo).toHaveBeenCalledTimes(1);
  });
});
