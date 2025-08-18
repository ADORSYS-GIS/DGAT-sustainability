import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserCard } from "../UserCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "manageUsers.verified": "Verified",
        "manageUsers.notVerified": "Not Verified",
        "common.edit": "Edit",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("OrgUserManageUsers/UserCard", () => {
  const baseUser = {
    id: "u1",
    firstName: "Alice",
    lastName: "Smith",
    username: "asmith",
    email: "alice@example.com",
    emailVerified: true,
  } as any;

  const defaultProps = {
    user: { ...baseUser, categories: ["Environmental", "Social"] },
    orgName: "Test Org",
    index: 0,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isDeleting: false,
  };

  it("renders user info and categories", () => {
    render(<UserCard {...defaultProps} />);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("@asmith")).toBeInTheDocument();
    expect(screen.getByText("Org: Test Org")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Environmental")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
  });

  it("shows verified badge and allows edit/delete actions", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<UserCard {...defaultProps} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText("Verified")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    // Delete button has trash icon only; trigger by role order
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows not verified badge when email not verified", () => {
    render(
      <UserCard
        {...defaultProps}
        user={{ ...defaultProps.user, emailVerified: false }}
      />,
    );

    expect(screen.getByText("Not Verified")).toBeInTheDocument();
  });
});
