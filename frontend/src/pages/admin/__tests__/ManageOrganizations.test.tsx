import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManageOrganizations } from "../ManageOrganizations";

// Mock the hook
vi.mock("@/hooks/admin/useManageOrganizations", () => ({
  useManageOrganizations: () => ({
    showAddDialog: false,
    setShowAddDialog: vi.fn(),
    editingOrg: null,
    setEditingOrg: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    categories: [],
    categoriesLoading: false,
    showCategoryCreation: false,
    setShowCategoryCreation: vi.fn(),
    categoryFormData: {},
    setCategoryFormData: vi.fn(),
    organizations: [],
    isLoading: false,
    isOnline: true,
    createOrganizationMutation: { isPending: false },
    updateOrganizationMutation: { isPending: false },
    deleteOrganizationMutation: { isPending: false },
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    handleDomainChange: vi.fn(),
    addDomain: vi.fn(),
    removeDomain: vi.fn(),
    handleCreateCategory: vi.fn(),
  }),
}));

// Mock components
vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/admin/ManageOrganizations", () => ({
  OrganizationHeader: () => <div data-testid="org-header">Header</div>,
  OrganizationList: () => <div data-testid="org-list">List</div>,
  OrganizationForm: () => <div data-testid="org-form">Form</div>,
}));

vi.mock("@/components/admin/ManageCategories", () => ({
  OfflineStatusIndicator: () => (
    <div data-testid="offline-indicator">Offline</div>
  ),
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("ManageOrganizations", () => {
  it("renders manage organizations components", () => {
    render(<ManageOrganizations />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("org-header")).toBeInTheDocument();
    expect(screen.getByTestId("org-list")).toBeInTheDocument();
    expect(screen.getByTestId("org-form")).toBeInTheDocument();
  });
});
