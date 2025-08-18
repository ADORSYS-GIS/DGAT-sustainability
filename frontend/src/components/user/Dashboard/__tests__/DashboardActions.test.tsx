import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardActions } from "../DashboardActions";

// Mock FeatureCard component
vi.mock("@/components/shared/FeatureCard", () => ({
  FeatureCard: ({ title, description, onClick }: any) => (
    <div data-testid={`feature-card-${title}`} onClick={onClick}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

describe("DashboardActions", () => {
  const mockActions = [
    {
      title: "Start Assessment",
      description: "Begin a new sustainability assessment",
      icon: () => <div>Icon1</div>,
      color: "green" as const,
      onClick: vi.fn(),
    },
    {
      title: "View Submissions",
      description: "Review your previous submissions",
      icon: () => <div>Icon2</div>,
      color: "blue" as const,
      onClick: vi.fn(),
    },
  ];

  it("renders all action cards", () => {
    render(<DashboardActions actions={mockActions} />);

    expect(
      screen.getByTestId("feature-card-Start Assessment"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("feature-card-View Submissions"),
    ).toBeInTheDocument();
  });

  it("displays action titles and descriptions", () => {
    render(<DashboardActions actions={mockActions} />);

    expect(screen.getByText("Start Assessment")).toBeInTheDocument();
    expect(
      screen.getByText("Begin a new sustainability assessment"),
    ).toBeInTheDocument();
    expect(screen.getByText("View Submissions")).toBeInTheDocument();
    expect(
      screen.getByText("Review your previous submissions"),
    ).toBeInTheDocument();
  });

  it("calls onClick when action card is clicked", () => {
    const mockOnClick = vi.fn();
    const actionsWithMock = [{ ...mockActions[0], onClick: mockOnClick }];

    render(<DashboardActions actions={actionsWithMock} />);

    const actionCard = screen.getByTestId("feature-card-Start Assessment");
    fireEvent.click(actionCard);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("renders correct number of action cards", () => {
    render(<DashboardActions actions={mockActions} />);

    const actionCards = screen.getAllByTestId(/feature-card-/);
    expect(actionCards).toHaveLength(2);
  });
});
