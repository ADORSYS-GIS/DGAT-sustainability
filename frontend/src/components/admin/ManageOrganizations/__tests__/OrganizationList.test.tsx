import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizationList } from "../OrganizationList";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "manageOrganizations.domains": "Domains",
        "manageOrganizations.description": "Description",
        "manageOrganizations.edit": "Edit",
        "manageOrganizations.delete": "Delete",
        "manageOrganizations.noOrganizations": "No organizations yet",
        "manageOrganizations.getStarted":
          "Create your first organization to get started.",
      };
      return translations[key] || key;
    },
  }),
}));

describe("OrganizationList", () => {
  const mockOrganizations = [
    {
      id: "1",
      name: "Test Organization 1",
      alias: "test1",
      enabled: true,
      description: "Test organization description",
      redirectUrl: "https://test1.com",
      domains: [
        { name: "test1.com", verified: true },
        { name: "test1.org", verified: false },
      ],
      attributes: {},
    },
    {
      id: "2",
      name: "Test Organization 2",
      alias: "test2",
      enabled: false,
      description: null,
      redirectUrl: null,
      domains: [],
      attributes: {},
    },
  ];

  const defaultProps = {
    organizations: mockOrganizations,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all organizations in a grid", () => {
    render(<OrganizationList {...defaultProps} />);

    expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    expect(screen.getByText("Test Organization 2")).toBeInTheDocument();
  });

  it("should display organization names as card titles", () => {
    render(<OrganizationList {...defaultProps} />);

    expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    expect(screen.getByText("Test Organization 2")).toBeInTheDocument();
  });

  it("should display domains when available", () => {
    render(<OrganizationList {...defaultProps} />);

    expect(screen.getByText("test1.com, test1.org")).toBeInTheDocument();
  });

  it("should display description when available", () => {
    render(<OrganizationList {...defaultProps} />);

    expect(
      screen.getByText("Test organization description"),
    ).toBeInTheDocument();
  });

  it("should not display domains section when no domains exist", () => {
    render(<OrganizationList {...defaultProps} />);

    // The second organization has no domains, so we shouldn't see a domains section for it
    const domainsElements = screen.getAllByText(/Domains:/);
    expect(domainsElements).toHaveLength(1); // Only one organization has domains
  });

  it("should not display description section when no description exists", () => {
    render(<OrganizationList {...defaultProps} />);

    // The second organization has no description, so we shouldn't see a description section for it
    const descriptionElements = screen.getAllByText(/Description:/);
    expect(descriptionElements).toHaveLength(1); // Only one organization has description
  });

  it("should render edit and delete buttons for each organization", () => {
    render(<OrganizationList {...defaultProps} />);

    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = screen.getAllByText("Delete");

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it("should call onEdit when edit button is clicked", () => {
    render(<OrganizationList {...defaultProps} />);

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockOrganizations[0]);
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<OrganizationList {...defaultProps} />);

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith("1");
  });

  it("should disable buttons when isPending is true", () => {
    render(<OrganizationList {...defaultProps} isPending={true} />);

    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = screen.getAllByText("Delete");

    editButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should show empty state when no organizations exist", () => {
    render(<OrganizationList {...defaultProps} organizations={[]} />);

    expect(screen.getByText("No organizations yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first organization to get started."),
    ).toBeInTheDocument();
  });

  it("should render building icons for organizations", () => {
    render(<OrganizationList {...defaultProps} />);

    // The Building2 icon should be present (it's rendered as an SVG)
    const buildingIcons = document.querySelectorAll("svg");
    expect(buildingIcons.length).toBeGreaterThan(0);
  });

  it("should render building icon in empty state", () => {
    render(<OrganizationList {...defaultProps} organizations={[]} />);

    // The empty state should also have a building icon
    const buildingIcons = document.querySelectorAll("svg");
    expect(buildingIcons.length).toBeGreaterThan(0);
  });

  it("should apply animation delay to cards", () => {
    render(<OrganizationList {...defaultProps} />);

    const cards = document.querySelectorAll('[style*="animation-delay"]');
    expect(cards.length).toBe(2); // Two organizations

    // Check that animation delays are applied
    const firstCard = cards[0] as HTMLElement;
    const secondCard = cards[1] as HTMLElement;

    expect(firstCard.style.animationDelay).toBe("0ms");
    expect(secondCard.style.animationDelay).toBe("100ms");
  });
});
