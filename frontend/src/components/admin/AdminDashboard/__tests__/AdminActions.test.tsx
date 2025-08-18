import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminActions } from "../AdminActions";
import { Settings, Users } from "lucide-react";

// Mock FeatureCard component
vi.mock("@/components/shared/FeatureCard", () => ({
  FeatureCard: ({
    title,
    description,
    onClick,
  }: {
    title: string;
    description: string;
    onClick: () => void;
  }) => (
    <div data-testid="feature-card" onClick={onClick}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

describe("AdminActions", () => {
  const mockActions = [
    {
      title: "Manage Users",
      description: "Add and manage user accounts",
      icon: Users,
      color: "blue" as const,
      onClick: vi.fn(),
    },
    {
      title: "System Settings",
      description: "Configure system settings",
      icon: Settings,
      color: "green" as const,
      onClick: vi.fn(),
    },
  ];

  it("should render all action cards", () => {
    render(<AdminActions actions={mockActions} />);

    expect(screen.getByText("Manage Users")).toBeInTheDocument();
    expect(screen.getByText("System Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Add and manage user accounts"),
    ).toBeInTheDocument();
    expect(screen.getByText("Configure system settings")).toBeInTheDocument();
  });

  it("should call onClick when action card is clicked", () => {
    render(<AdminActions actions={mockActions} />);

    const cards = screen.getAllByTestId("feature-card");
    fireEvent.click(cards[0]);

    expect(mockActions[0].onClick).toHaveBeenCalledTimes(1);
  });
});
