import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserList } from "../UserList";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "manageUsers.orgLabel": "Organization:",
        "manageUsers.unknown": "Unknown",
        "manageUsers.verified": "Verified",
        "manageUsers.notVerified": "Not Verified",
        "manageUsers.noUsersYet": "No users yet",
        "manageUsers.noUsersDescription":
          "No users found in this organization.",
      };
      return translations[key] || key;
    },
  }),
}));

describe("UserList", () => {
  const mockUsers = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      username: "johndoe",
      email: "john.doe@example.com",
      emailVerified: true,
      enabled: true,
      emailVerifiedAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      username: "janesmith",
      email: "jane.smith@example.com",
      emailVerified: false,
      enabled: true,
      emailVerifiedAt: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  const defaultProps = {
    users: mockUsers,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isPending: false,
    selectedOrgName: "Test Organization",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all users in a grid", () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should display user names as card titles", () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should display usernames", () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText("@johndoe")).toBeInTheDocument();
    expect(screen.getByText("@janesmith")).toBeInTheDocument();
  });

  it("should display user emails", () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
  });

  it("should display organization name", () => {
    render(<UserList {...defaultProps} />);

    const orgElements = screen.getAllByText(/Organization: Test Organization/);
    expect(orgElements.length).toBeGreaterThan(0);
  });

  it("should display unknown organization when no organization is selected", () => {
    render(<UserList {...defaultProps} selectedOrgName="" />);

    const unknownElements = screen.getAllByText(/Organization: Unknown/);
    expect(unknownElements.length).toBeGreaterThan(0);
  });

  it("should display verification badges correctly", () => {
    render(<UserList {...defaultProps} />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Not Verified")).toBeInTheDocument();
  });

  it("should render edit and delete buttons for each user", () => {
    render(<UserList {...defaultProps} />);

    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = document.querySelectorAll(
      'button[class*="text-red-600"]',
    );

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it("should call onEdit when edit button is clicked", () => {
    render(<UserList {...defaultProps} />);

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<UserList {...defaultProps} />);

    const deleteButtons = document.querySelectorAll(
      'button[class*="text-red-600"]',
    );
    fireEvent.click(deleteButtons[0] as HTMLElement);

    expect(defaultProps.onDelete).toHaveBeenCalledWith("1");
  });

  it("should disable buttons when isPending is true", () => {
    render(<UserList {...defaultProps} isPending={true} />);

    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = document.querySelectorAll(
      'button[class*="text-red-600"]',
    );

    editButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should show empty state when no users exist", () => {
    render(<UserList {...defaultProps} users={[]} />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(
      screen.getByText("No users found in this organization."),
    ).toBeInTheDocument();
  });

  it("should render user icons for users", () => {
    render(<UserList {...defaultProps} />);

    // The Users icon should be present (it's rendered as an SVG)
    const userIcons = document.querySelectorAll("svg");
    expect(userIcons.length).toBeGreaterThan(0);
  });

  it("should render user icon in empty state", () => {
    render(<UserList {...defaultProps} users={[]} />);

    // The empty state should also have a user icon
    const userIcons = document.querySelectorAll("svg");
    expect(userIcons.length).toBeGreaterThan(0);
  });

  it("should apply animation delay to cards", () => {
    render(<UserList {...defaultProps} />);

    const cards = document.querySelectorAll('[style*="animation-delay"]');
    expect(cards.length).toBe(2); // Two users

    // Check that animation delays are applied
    const firstCard = cards[0] as HTMLElement;
    const secondCard = cards[1] as HTMLElement;

    expect(firstCard.style.animationDelay).toBe("0ms");
    expect(secondCard.style.animationDelay).toBe("100ms");
  });

  it("should render mail icons for email display", () => {
    render(<UserList {...defaultProps} />);

    // The Mail icon should be present for each user
    const mailIcons = document.querySelectorAll("svg");
    expect(mailIcons.length).toBeGreaterThan(0);
  });

  it("should display verification status with correct styling", () => {
    render(<UserList {...defaultProps} />);

    const verifiedBadge = screen.getByText("Verified");
    const notVerifiedBadge = screen.getByText("Not Verified");

    expect(verifiedBadge).toBeInTheDocument();
    expect(notVerifiedBadge).toBeInTheDocument();

    // Check that badges have the correct classes
    expect(verifiedBadge).toHaveClass("bg-green-500");
    expect(notVerifiedBadge).toHaveClass("bg-red-500");
  });
});
