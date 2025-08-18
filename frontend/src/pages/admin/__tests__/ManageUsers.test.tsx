import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManageUsers } from "../ManageUsers";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the hook
vi.mock("@/hooks/admin/useManageUsers", () => ({
  useManageUsers: () => ({
    showAddDialog: false,
    setShowAddDialog: vi.fn(),
    editingUser: null,
    setEditingUser: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    isCreatingUser: false,
    selectedOrg: { id: "org1", name: "Test Org" },
    setSelectedOrg: vi.fn(),
    organizations: [],
    users: [],
    isLoading: false,
    createUserMutation: { isPending: false },
    updateUserMutation: { isPending: false },
    deleteUserMutation: { isPending: false },
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    handleBackToOrganizations: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock components
vi.mock("@/components/admin/ManageUsers", () => ({
  UserHeader: () => <div data-testid="user-header">Header</div>,
  OrganizationSelector: () => <div data-testid="org-selector">Selector</div>,
  UserForm: () => <div data-testid="user-form">Form</div>,
  UserList: () => <div data-testid="user-list">List</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("ManageUsers", () => {
  it("renders manage users components", () => {
    render(<ManageUsers />);

    expect(screen.getByTestId("user-header")).toBeInTheDocument();
    expect(screen.getByTestId("user-form")).toBeInTheDocument();
    expect(screen.getByTestId("user-list")).toBeInTheDocument();
  });
});
