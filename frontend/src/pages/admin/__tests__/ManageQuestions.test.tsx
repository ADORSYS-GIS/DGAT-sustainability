import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManageQuestions } from "../ManageQuestions";

// Mock the hook
vi.mock("@/hooks/admin/useManageQuestions", () => ({
  useManageQuestions: () => ({
    isDialogOpen: false,
    setIsDialogOpen: vi.fn(),
    editingQuestion: null,
    setEditingQuestion: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    categories: [],
    questions: [],
    isLoading: false,
    error: null,
    isOnline: true,
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    refetchQuestions: vi.fn(),
    isPending: false,
  }),
}));

// Mock components
vi.mock("@/components/admin/ManageQuestions", () => ({
  QuestionHeader: () => <div data-testid="question-header">Header</div>,
  QuestionForm: () => <div data-testid="question-form">Form</div>,
  QuestionList: () => <div data-testid="question-list">List</div>,
}));

vi.mock("@/components/shared", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading</div>,
}));

describe("ManageQuestions", () => {
  it("renders manage questions components", () => {
    render(<ManageQuestions />);

    expect(screen.getByTestId("question-header")).toBeInTheDocument();
    expect(screen.getByTestId("question-form")).toBeInTheDocument();
    expect(screen.getByTestId("question-list")).toBeInTheDocument();
  });
});
