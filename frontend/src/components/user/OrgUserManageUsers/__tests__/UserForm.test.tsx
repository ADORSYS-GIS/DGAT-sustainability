import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserForm } from "../UserForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "manageUsers.editUser": "Edit User",
        "manageUsers.addNewUser": "Add New User",
        "manageUsers.orgUser": "Org_User",
        "manageUsers.user": "User",
        "common.processing": "Processing",
        "common.update": "Update",
        "common.create": "Create",
        "common.cancel": "Cancel",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("OrgUserManageUsers/UserForm", () => {
  const baseProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    editingUser: null,
    formData: { email: "", roles: [], categories: [] },
    setFormData: vi.fn(),
    categories: ["Environmental", "Social"],
    onSubmit: vi.fn(),
    onReset: vi.fn(),
    isPending: false,
  };

  it("renders add user dialog with fields", () => {
    render(<UserForm {...baseProps} />);

    expect(screen.getByText("Add New User")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText("Environmental")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toHaveValue("Org_User");
    expect(
      screen.getByRole("button", { name: /create user/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("submits and cancels via buttons", () => {
    const onSubmit = vi.fn();
    const onReset = vi.fn();

    render(<UserForm {...baseProps} onSubmit={onSubmit} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("disables primary button when pending and shows processing text", () => {
    render(<UserForm {...baseProps} isPending={true} />);

    const primary = screen.getByRole("button", { name: /processing user/i });
    expect(primary).toBeDisabled();
  });

  it("renders edit mode title", () => {
    const editingUser = { id: "u1" } as any;
    render(<UserForm {...baseProps} editingUser={editingUser} />);

    expect(screen.getByText("Edit User")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update user/i }),
    ).toBeInTheDocument();
  });
});
