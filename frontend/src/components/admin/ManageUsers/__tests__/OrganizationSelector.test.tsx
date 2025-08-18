import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizationSelector } from "../OrganizationSelector";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "manageUsers.selectOrganization": "Select Organization",
        "manageUsers.clickOrgToManage":
          "Click on an organization to manage its users",
      })[key] || key,
  }),
}));

describe("OrganizationSelector", () => {
  const mockOrganizations = [
    {
      id: "1",
      name: "Test Organization 1",
      domains: ["test1.com", "test1.org"],
      description: "Test organization description",
    },
    {
      id: "2",
      name: "Test Organization 2",
      domains: ["test2.com"],
      attributes: { description: ["Another test organization"] },
    },
  ];

  const mockOnSelectOrganization = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render header and all organizations", () => {
    render(
      <OrganizationSelector
        organizations={mockOrganizations}
        onSelectOrganization={mockOnSelectOrganization}
      />,
    );

    expect(screen.getByText("Select Organization")).toBeInTheDocument();
    expect(
      screen.getByText("Click on an organization to manage its users"),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    expect(screen.getByText("Test Organization 2")).toBeInTheDocument();
  });

  it("should display organization domains", () => {
    render(
      <OrganizationSelector
        organizations={mockOrganizations}
        onSelectOrganization={mockOnSelectOrganization}
      />,
    );

    expect(screen.getByText("test1.com, test1.org")).toBeInTheDocument();
    expect(screen.getByText("test2.com")).toBeInTheDocument();
  });

  it("should display organization descriptions", () => {
    render(
      <OrganizationSelector
        organizations={mockOrganizations}
        onSelectOrganization={mockOnSelectOrganization}
      />,
    );

    expect(
      screen.getByText("Test organization description"),
    ).toBeInTheDocument();
    expect(screen.getByText("Another test organization")).toBeInTheDocument();
  });

  it("should call onSelectOrganization when organization card is clicked", () => {
    render(
      <OrganizationSelector
        organizations={mockOrganizations}
        onSelectOrganization={mockOnSelectOrganization}
      />,
    );

    const firstOrgCard = screen
      .getByText("Test Organization 1")
      .closest(".cursor-pointer");
    fireEvent.click(firstOrgCard!);

    expect(mockOnSelectOrganization).toHaveBeenCalledWith(mockOrganizations[0]);
  });
});
