import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizationHeader } from "../OrganizationHeader";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageOrganizations.title": "Manage Organizations",
        "manageOrganizations.subtitle":
          "Create and manage organizations for sustainability assessments",
        "manageOrganizations.createOrganization": "Create Organization",
      })[key] || key,
  }),
}));

describe("OrganizationHeader", () => {
  const mockOnCreateClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render header with title and subtitle", () => {
    render(<OrganizationHeader onCreateClick={mockOnCreateClick} />);

    expect(screen.getByText("Manage Organizations")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create and manage organizations for sustainability assessments",
      ),
    ).toBeInTheDocument();
  });

  it("should render create organization button", () => {
    render(<OrganizationHeader onCreateClick={mockOnCreateClick} />);

    expect(screen.getByText("Create Organization")).toBeInTheDocument();
  });

  it("should call onCreateClick when button is clicked", () => {
    render(<OrganizationHeader onCreateClick={mockOnCreateClick} />);

    const button = screen.getByText("Create Organization");
    fireEvent.click(button);

    expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
  });

  it("should render building icon", () => {
    render(<OrganizationHeader onCreateClick={mockOnCreateClick} />);

    const icons = document.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });
});
