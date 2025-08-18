import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManageCategories } from "../ManageCategories";

// Mock the hook
vi.mock("@/hooks/admin/useManageCategories", () => ({
  useManageCategories: () => ({
    isDialogOpen: false,
    setIsDialogOpen: vi.fn(),
    editingCategory: null,
    setEditingCategory: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    showDialogWeightError: false,
    setShowDialogWeightError: vi.fn(),
    categories: [],
    isLoading: false,
    error: null,
    isPending: false,
    isOnline: true,
    totalWeight: 0,
    weightExceeds: false,
    weightNot100: false,
    calculateDefaultWeight: vi.fn(),
    redistributeWeights: vi.fn(),
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock components
vi.mock("@/components/admin/ManageCategories", () => ({
  CategoryHeader: () => <div data-testid="category-header">Header</div>,
  OfflineStatusIndicator: () => (
    <div data-testid="offline-indicator">Offline</div>
  ),
  CategoryForm: () => <div data-testid="category-form">Form</div>,
  CategoryList: () => <div data-testid="category-list">List</div>,
  ErrorState: () => <div data-testid="error-state">Error</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("ManageCategories", () => {
  it("renders manage categories components", () => {
    render(<ManageCategories />);

    expect(screen.getByTestId("category-header")).toBeInTheDocument();
    expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("category-form")).toBeInTheDocument();
    expect(screen.getByTestId("category-list")).toBeInTheDocument();
  });
});
