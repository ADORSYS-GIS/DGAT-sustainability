import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryList } from "../CategoryList";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { weight?: number; order?: number; total?: number },
    ) => {
      const translations: Record<string, string> = {
        "manageCategories.weightLabel": `Weight: ${options?.weight}%, Order: ${options?.order}`,
        "manageCategories.totalWeightExceeds": "Total weight exceeds 100%",
        "manageCategories.redistributeWeights": "Redistribute Weights",
        "manageCategories.totalWeightNot100": `Total weight is ${options?.total}% (should be 100%)`,
        "manageCategories.noCategoriesYet": "No categories yet",
      };
      return translations[key] || key;
    },
  }),
}));

describe("CategoryList", () => {
  const mockCategories = [
    {
      category_id: "1",
      name: "Environmental Impact",
      weight: 40,
      order: 1,
      template_id: "t1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      category_id: "2",
      name: "Social Responsibility",
      weight: 30,
      order: 2,
      template_id: "t1",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ];

  const mockProps = {
    categories: mockCategories,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isPending: false,
    weightExceeds: false,
    weightNot100: false,
    totalWeight: 70,
    onRedistributeWeights: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all categories with edit and delete buttons", () => {
    render(<CategoryList {...mockProps} />);

    expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
    expect(screen.getByText("Social Responsibility")).toBeInTheDocument();
    expect(screen.getByText("Weight: 40%, Order: 1")).toBeInTheDocument();
    expect(screen.getByText("Weight: 30%, Order: 2")).toBeInTheDocument();
  });

  it("should call onEdit when edit button is clicked", () => {
    render(<CategoryList {...mockProps} />);

    const editButtons = document.querySelectorAll("button");
    fireEvent.click(editButtons[0]); // First edit button

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockCategories[0]);
  });

  it("should call onDelete when delete button is clicked", () => {
    render(<CategoryList {...mockProps} />);

    const deleteButtons = document.querySelectorAll("button");
    fireEvent.click(deleteButtons[1]); // First delete button

    expect(mockProps.onDelete).toHaveBeenCalledWith("1");
  });

  it("should show weight exceeds warning when weightExceeds is true", () => {
    render(<CategoryList {...mockProps} weightExceeds={true} />);

    expect(screen.getByText("Total weight exceeds 100%")).toBeInTheDocument();
    expect(screen.getByText("Redistribute Weights")).toBeInTheDocument();
  });

  it("should show weight not 100 warning when weightNot100 is true", () => {
    render(<CategoryList {...mockProps} weightNot100={true} />);

    expect(
      screen.getByText("Total weight is 70% (should be 100%)"),
    ).toBeInTheDocument();
  });

  it("should show empty state when no categories", () => {
    render(<CategoryList {...mockProps} categories={[]} />);

    expect(screen.getByText("No categories yet")).toBeInTheDocument();
  });
});
