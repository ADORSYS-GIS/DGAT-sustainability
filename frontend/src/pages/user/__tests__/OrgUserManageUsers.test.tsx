import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgUserManageUsers } from "../OrgUserManageUsers";

vi.mock("@/hooks/user/useOrgUserManageUsers", () => ({
  useOrgUserManageUsers: () => ({
    showAddDialog: false,
    setShowAddDialog: vi.fn(),
    editingUser: null,
    formData: { email: "", roles: [], categories: [] },
    setFormData: vi.fn(),
    usersLoading: false,
    users: [],
    orgName: "Test Org",
    categories: ["Environmental"],
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    handleBackToDashboard: vi.fn(),
    handleAddUser: vi.fn(),
    refetch: vi.fn(),
    createUser: { isPending: false },
    updateUser: { isPending: false },
    deleteUser: { isPending: false },
  }),
}));

vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/user/OrgUserManageUsers", () => ({
  ManageUsersHeader: () => <div data-testid="manage-users-header">Header</div>,
  UserForm: () => <div data-testid="user-form">Form</div>,
  UserCard: () => <div data-testid="user-card">Card</div>,
  EmptyState: () => <div data-testid="empty-state">Empty</div>,
}));

describe("User OrgUserManageUsers Page", () => {
  it("renders header and form", () => {
    render(<OrgUserManageUsers />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("manage-users-header")).toBeInTheDocument();
    expect(screen.getByTestId("user-form")).toBeInTheDocument();
  });
});
