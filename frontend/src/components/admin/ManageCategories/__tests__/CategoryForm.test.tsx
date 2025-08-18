import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryForm } from "../CategoryForm";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { current?: number; new?: number; total?: number },
    ) => {
      const translations: Record<string, string> = {
        "manageCategories.addCategory": "Add Category",
        "manageCategories.editCategory": "Edit Category",
        "manageCategories.categoryName": "Category Name",
        "manageCategories.categoryNamePlaceholder": "Enter category name",
        "manageCategories.weight": "Weight",
        "manageCategories.currentTotal": `Current total: ${options?.current}% | New total: ${options?.new}%`,
        "manageCategories.displayOrder": "Display Order",
        "manageCategories.weightExceedsError": "Total weight exceeds 100%",
        "manageCategories.redistributeWeights": "Redistribute Weights",
        "manageCategories.totalWeightNot100ForNew": `Total weight will be ${options?.total}%. Must equal 100%.`,
        "manageCategories.saving": "Saving...",
        "manageCategories.updateCategory": "Update Category",
        "manageCategories.createCategory": "Create Category",
      };
      return translations[key] || key;
    },
  }),
}));

describe("CategoryForm", () => {
  const mockCategory = {
    category_id: "1",
    name: "Environmental Impact",
    weight: 40,
    order: 1,
    template_id: "t1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  const defaultProps = {
    isDialogOpen: false,
    setIsDialogOpen: vi.fn(),
    editingCategory: null,
    setEditingCategory: vi.fn(),
    formData: {
      name: "",
      weight: 30,
      order: 2,
    },
    setFormData: vi.fn(),
    onSubmit: vi.fn(),
    isPending: false,
    totalWeight: 70,
    categoriesLength: 1,
    calculateDefaultWeight: vi.fn(() => 30),
    showDialogWeightError: false,
    setShowDialogWeightError: vi.fn(),
    redistributeWeights: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render add category button", () => {
    render(<CategoryForm {...defaultProps} />);

    expect(screen.getByText("Add Category")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should open dialog and initialize form when add button is clicked", () => {
    render(<CategoryForm {...defaultProps} />);

    const addButton = screen.getByText("Add Category");
    fireEvent.click(addButton);

    expect(defaultProps.setEditingCategory).toHaveBeenCalledWith(null);
    expect(defaultProps.setFormData).toHaveBeenCalledWith({
      name: "",
      weight: 30,
      order: 2,
    });
    expect(defaultProps.setShowDialogWeightError).toHaveBeenCalledWith(false);
  });

  it("should render dialog content when open", () => {
    render(<CategoryForm {...defaultProps} isDialogOpen={true} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Category Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight")).toBeInTheDocument();
    expect(screen.getByLabelText("Display Order")).toBeInTheDocument();
  });

  it("should show edit title when editing category", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        editingCategory={mockCategory}
      />,
    );

    expect(screen.getByText("Edit Category")).toBeInTheDocument();
  });

  it("should show current total weight for new categories", () => {
    render(<CategoryForm {...defaultProps} isDialogOpen={true} />);

    expect(
      screen.getByText("Current total: 70% | New total: 100%"),
    ).toBeInTheDocument();
  });

  it("should not show current total for editing categories", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        editingCategory={mockCategory}
      />,
    );

    expect(screen.queryByText(/Current total:/)).not.toBeInTheDocument();
  });

  it("should show weight exceeds error when showDialogWeightError is true", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        showDialogWeightError={true}
      />,
    );

    expect(screen.getByText("Total weight exceeds 100%")).toBeInTheDocument();
    expect(screen.getByText("Redistribute Weights")).toBeInTheDocument();
  });

  it("should show weight not 100 warning for new categories", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        formData={{ name: "", weight: 20, order: 2 }}
      />,
    );

    expect(
      screen.getByText("Total weight will be 90%. Must equal 100%."),
    ).toBeInTheDocument();
  });

  it("should call redistributeWeights when redistribute button is clicked", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        showDialogWeightError={true}
      />,
    );

    const redistributeButton = screen.getByText("Redistribute Weights");
    fireEvent.click(redistributeButton);

    expect(defaultProps.redistributeWeights).toHaveBeenCalledWith(true);
    expect(defaultProps.setShowDialogWeightError).toHaveBeenCalledWith(false);
  });

  it("should disable submit button when weight exceeds 100%", () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        showDialogWeightError={true}
      />,
    );

    const submitButton = screen.getByText("Create Category");
    expect(submitButton).toBeDisabled();
  });

  it("should disable submit button when pending", () => {
    render(
      <CategoryForm {...defaultProps} isDialogOpen={true} isPending={true} />,
    );

    const submitButton = screen.getByText("Saving...");
    expect(submitButton).toBeDisabled();
  });

  it("should call onSubmit when form is submitted", async () => {
    render(
      <CategoryForm
        {...defaultProps}
        isDialogOpen={true}
        formData={{ name: "Test Category", weight: 30, order: 2 }}
      />,
    );

    const submitButton = screen.getByText("Create Category");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  it("should update form data when inputs change", () => {
    render(<CategoryForm {...defaultProps} isDialogOpen={true} />);

    const nameInput = screen.getByLabelText("Category Name");
    fireEvent.change(nameInput, { target: { value: "New Category" } });

    expect(defaultProps.setFormData).toHaveBeenCalledWith({
      name: "New Category",
      weight: 30,
      order: 2,
    });
  });
});
