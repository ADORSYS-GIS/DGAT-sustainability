import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "manageUsers.noUsersYet": "No users yet",
        "manageUsers.addFirstUserDesc": "Add your first user to get started",
        "manageUsers.addFirstUser": "Add First User",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("OrgUserManageUsers/EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState onAddUser={vi.fn()} />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first user to get started"),
    ).toBeInTheDocument();
  });

  it("renders add button and triggers handler", () => {
    const onAddUser = vi.fn();
    render(<EmptyState onAddUser={onAddUser} />);

    const btn = screen.getByRole("button", { name: /add first user/i });
    fireEvent.click(btn);
    expect(onAddUser).toHaveBeenCalledTimes(1);
  });

  it("renders users icon", () => {
    render(<EmptyState onAddUser={vi.fn()} />);
    const icon = document.querySelector(".lucide-users");
    expect(icon).toBeInTheDocument();
  });
});
