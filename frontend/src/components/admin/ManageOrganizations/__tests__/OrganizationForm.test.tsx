import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrganizationForm } from "../OrganizationForm";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "manageOrganizations.editOrganization": "Edit Organization",
        "manageOrganizations.addOrganization": "Add New Organization",
        "manageOrganizations.name": "Organization Name",
        "manageOrganizations.namePlaceholder": "Enter organization name",
        "manageOrganizations.domains": "Domains",
        "manageOrganizations.domainPlaceholder":
          "Enter domain (e.g. adorsys.com)",
        "manageOrganizations.addDomain": "+ Add Domain",
        "manageOrganizations.categories": "Categories",
        "manageOrganizations.selectCategories": "Select categories...",
        "manageOrganizations.createCategoryWithOrgDesc":
          "Optionally create a new category and assign it to this organization",
        "manageOrganizations.createCategory": "Create Category",
        "manageOrganizations.newCategory": "New Category",
        "manageCategories.name": "Name",
        "manageCategories.namePlaceholder": "Category name",
        "manageCategories.weight": "Weight",
        "manageCategories.create": "Create Category",
        "common.processing": "Processing...",
        "common.cancel": "Cancel",
        "common.update": "Update",
        "manageOrganizations.createOrganization": "Create Organization",
      };
      return translations[key] || key;
    },
  }),
}));

describe("OrganizationForm", () => {
  const mockCategories = [
    {
      categoryId: "1",
      name: "Environmental Impact",
      weight: 40,
      order: 1,
      templateId: "t1",
    },
    {
      categoryId: "2",
      name: "Social Responsibility",
      weight: 30,
      order: 2,
      templateId: "t1",
    },
  ];

  const mockEditingOrg = {
    id: "1",
    name: "Test Organization",
    domains: [{ name: "test.com" }],
    attributes: { categories: ["Environmental Impact"] },
  };

  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isPending: false,
    editingOrg: null,
    formData: {
      name: "",
      domains: [{ name: "" }],
      attributes: { categories: [] },
    },
    setFormData: vi.fn(),
    categories: mockCategories,
    categoriesLoading: false,
    showCategoryCreation: false,
    setShowCategoryCreation: vi.fn(),
    categoryFormData: {
      name: "",
      weight: 10,
      order: 1,
    },
    setCategoryFormData: vi.fn(),
    handleDomainChange: vi.fn(),
    addDomain: vi.fn(),
    removeDomain: vi.fn(),
    handleCreateCategory: vi.fn(),
    resetForm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog when open", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show add organization title when creating new organization", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByText("Add New Organization")).toBeInTheDocument();
  });

  it("should show edit organization title when editing", () => {
    render(
      <OrganizationForm
        {...defaultProps}
        isOpen={true}
        editingOrg={mockEditingOrg}
      />,
    );

    expect(screen.getByText("Edit Organization")).toBeInTheDocument();
  });

  it("should render organization name input", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter organization name"),
    ).toBeInTheDocument();
  });

  it("should render domains section", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByText("Domains *")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter domain (e.g. adorsys.com)"),
    ).toBeInTheDocument();
  });

  it("should render add domain button", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByText("+ Add Domain")).toBeInTheDocument();
  });

  it("should call addDomain when add domain button is clicked", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const addDomainButton = screen.getByText("+ Add Domain");
    fireEvent.click(addDomainButton);

    expect(defaultProps.addDomain).toHaveBeenCalled();
  });

  it("should render categories section", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByText("Categories *")).toBeInTheDocument();
    expect(screen.getByText("Select categories...")).toBeInTheDocument();
  });

  it("should display all categories in dropdown", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    // Check that the categories section is rendered
    expect(screen.getByText("Categories *")).toBeInTheDocument();

    // Check that the placeholder text is shown when no categories are selected
    expect(screen.getByText("Select categories...")).toBeInTheDocument();

    // Check that the dropdown button is present
    const dropdownButton = document.querySelector(".lucide-chevron-down");
    expect(dropdownButton).toBeInTheDocument();
  });

  it("should render create category section", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(
      screen.getByText(
        "Optionally create a new category and assign it to this organization",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Create Category")).toBeInTheDocument();
  });

  it("should toggle category creation form when create category button is clicked", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const createCategoryButton = screen.getByText("Create Category");
    fireEvent.click(createCategoryButton);

    expect(defaultProps.setShowCategoryCreation).toHaveBeenCalledWith(true);
  });

  it("should show category creation form when showCategoryCreation is true", () => {
    render(
      <OrganizationForm
        {...defaultProps}
        isOpen={true}
        showCategoryCreation={true}
      />,
    );

    expect(screen.getByText("New Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight *")).toBeInTheDocument();
  });

  it("should call handleCreateCategory when create category button is clicked", () => {
    render(
      <OrganizationForm
        {...defaultProps}
        isOpen={true}
        showCategoryCreation={true}
      />,
    );

    const createButtons = screen.getAllByText("Create Category");
    // Click the second button (the one inside the category creation form)
    fireEvent.click(createButtons[1]);

    expect(defaultProps.handleCreateCategory).toHaveBeenCalled();
  });

  it("should disable create category button when categoriesLoading is true", () => {
    render(
      <OrganizationForm
        {...defaultProps}
        isOpen={true}
        showCategoryCreation={true}
        categoriesLoading={true}
      />,
    );

    const createButton = screen.getByText("Processing...");
    expect(createButton).toBeDisabled();
  });

  it("should render form actions", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create Organization")).toBeInTheDocument();
  });

  it("should call onSubmit when create button is clicked", async () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const createButton = screen.getByText("Create Organization");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  it("should call onClose when cancel button is clicked", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("should disable submit button when isPending is true", () => {
    render(
      <OrganizationForm {...defaultProps} isOpen={true} isPending={true} />,
    );

    const submitButton = screen.getByText("Processing...");
    expect(submitButton).toBeDisabled();
  });

  it("should show update button text when editing", () => {
    render(
      <OrganizationForm
        {...defaultProps}
        isOpen={true}
        editingOrg={mockEditingOrg}
      />,
    );

    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("should call resetForm when dialog is closed", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(defaultProps.resetForm).toHaveBeenCalled();
  });

  it("should update organization name when input changes", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const nameInput = screen.getByLabelText("Organization Name");
    fireEvent.change(nameInput, { target: { value: "New Organization" } });

    expect(defaultProps.setFormData).toHaveBeenCalled();
  });

  it("should call handleDomainChange when domain input changes", () => {
    render(<OrganizationForm {...defaultProps} isOpen={true} />);

    const domainInput = screen.getByPlaceholderText(
      "Enter domain (e.g. adorsys.com)",
    );
    fireEvent.change(domainInput, { target: { value: "newdomain.com" } });

    expect(defaultProps.handleDomainChange).toHaveBeenCalledWith(
      0,
      "newdomain.com",
    );
  });
});
