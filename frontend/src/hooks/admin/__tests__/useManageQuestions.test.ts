import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useManageQuestions } from "../useManageQuestions";
import { createMockCategory, createMockQuestion } from "@/test/setup";

// Mock the offline API hooks
vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineQuestions: vi.fn(),
  useOfflineCategories: vi.fn(),
  useOfflineQuestionsMutation: vi.fn(),
  useOfflineSyncStatus: vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock IndexedDB
vi.mock("@/services/indexeddb", () => ({
  offlineDB: {
    getAllQuestions: vi.fn(),
    deleteQuestion: vi.fn(),
    getAllCategories: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

// Import the mocked functions
import {
  useOfflineQuestions,
  useOfflineCategories,
  useOfflineQuestionsMutation,
  useOfflineSyncStatus,
} from "@/hooks/useOfflineApi";

describe("useManageQuestions", () => {
  const mockQuestions = [
    createMockQuestion({
      question_id: "1",
      category: "Category 1",
      latest_revision: {
        question_revision_id: "rev-1",
        question_id: "1",
        text: { en: "Question 1", es: "Pregunta 1" },
        weight: 5,
        created_at: "2024-01-01T00:00:00Z",
      },
    }),
  ];

  const mockCategories = [
    createMockCategory({ category_id: "1", name: "Category 1" }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useOfflineQuestions).mockReturnValue({
      data: { questions: [] },
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.mocked(useOfflineCategories).mockReturnValue({
      data: { categories: [] },
      isLoading: false,
      error: null,
    });

    vi.mocked(useOfflineQuestionsMutation).mockReturnValue({
      createQuestion: vi.fn(),
      updateQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      isPending: false,
    });

    vi.mocked(useOfflineSyncStatus).mockReturnValue({
      isOnline: true,
    });
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.editingQuestion).toBeNull();
      expect(result.current.formData).toEqual({
        text: {
          en: "",
          ss: "",
          pt: "",
          zu: "",
          de: "",
          fr: "",
        },
        weight: 5,
        categoryName: "",
        order: 1,
      });
    });
  });

  describe("data loading", () => {
    it("should load questions and categories", () => {
      vi.mocked(useOfflineQuestions).mockReturnValue({
        data: { questions: mockQuestions },
        isLoading: false,
        refetch: vi.fn(),
      });

      vi.mocked(useOfflineCategories).mockReturnValue({
        data: { categories: mockCategories },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.categories).toEqual(mockCategories);
    });

    it("should handle loading state", () => {
      vi.mocked(useOfflineQuestions).mockReturnValue({
        data: { questions: [] },
        isLoading: true,
        refetch: vi.fn(),
      });

      vi.mocked(useOfflineCategories).mockReturnValue({
        data: { categories: [] },
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", () => {
      const mockError = new Error("Failed to load categories");
      vi.mocked(useOfflineCategories).mockReturnValue({
        data: { categories: [] },
        isLoading: false,
        error: mockError,
      });

      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe("question editing", () => {
    it("should open edit dialog with question data", () => {
      const { result } = renderHook(() => useManageQuestions());

      const questionToEdit = mockQuestions[0];

      act(() => {
        result.current.handleEdit(questionToEdit);
      });

      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.editingQuestion).toBe(questionToEdit);
      expect(result.current.formData).toEqual({
        text: { en: "Question 1", es: "Pregunta 1" },
        weight: 5,
        categoryName: "Category 1",
        order: 1,
      });
    });

    it("should handle questions without text", () => {
      const questionWithoutText = createMockQuestion({
        question_id: "3",
        category: "Category 3",
        latest_revision: {
          question_revision_id: "rev-3",
          question_id: "3",
          text: {},
          weight: 4,
          created_at: "2024-01-01T00:00:00Z",
        },
      });

      const { result } = renderHook(() => useManageQuestions());

      act(() => {
        result.current.handleEdit(questionWithoutText);
      });

      expect(result.current.formData.text).toEqual({});
    });
  });

  describe("form submission", () => {
    it("should handle question creation successfully", async () => {
      const { result } = renderHook(() => useManageQuestions());

      // Set form data for new question
      act(() => {
        result.current.setFormData({
          text: { en: "New Question", es: "Nueva Pregunta" },
          weight: 7,
          categoryName: "Category 1",
          order: 1,
        });
      });

      // Mock successful creation
      vi.mocked(useOfflineQuestionsMutation).mockReturnValue({
        ...vi.mocked(useOfflineQuestionsMutation).mock.results[0].value,
        createQuestion: vi.fn(),
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .createQuestion,
      ).toHaveBeenCalledWith(
        {
          category: "Category 1",
          text: { en: "New Question", es: "Nueva Pregunta" },
          weight: 7,
        },
        expect.any(Object),
      );
    });

    it("should handle question update successfully", async () => {
      const { result } = renderHook(() => useManageQuestions());

      const questionToEdit = mockQuestions[0];

      // Set up editing state
      act(() => {
        result.current.setEditingQuestion(questionToEdit);
        result.current.setFormData({
          text: { en: "Updated Question" },
          weight: 8,
          categoryName: "Category 2",
          order: 1,
        });
      });

      // Mock successful update
      vi.mocked(useOfflineQuestionsMutation).mockReturnValue({
        ...vi.mocked(useOfflineQuestionsMutation).mock.results[0].value,
        updateQuestion: vi.fn(),
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .updateQuestion,
      ).toHaveBeenCalledWith(
        "1",
        {
          category: "Category 2",
          text: { en: "Updated Question" },
          weight: 8,
        },
        expect.any(Object),
      );
    });

    it("should show error for missing category", async () => {
      const { result } = renderHook(() => useManageQuestions());

      // Set form data without category
      act(() => {
        result.current.setFormData({
          text: { en: "Question without category" },
          weight: 5,
          categoryName: "",
          order: 1,
        });
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .createQuestion,
      ).not.toHaveBeenCalled();
    });

    it("should show error for missing text", async () => {
      const { result } = renderHook(() => useManageQuestions());

      // Set form data without text
      act(() => {
        result.current.setFormData({
          text: { en: "", es: "" },
          weight: 5,
          categoryName: "Category 1",
          order: 1,
        });
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent);
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .createQuestion,
      ).not.toHaveBeenCalled();
    });
  });

  describe("question deletion", () => {
    it("should handle question deletion successfully", async () => {
      // Mock window.confirm to return true
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      const { result } = renderHook(() => useManageQuestions());

      // Mock successful deletion
      vi.mocked(useOfflineQuestionsMutation).mockReturnValue({
        ...vi.mocked(useOfflineQuestionsMutation).mock.results[0].value,
        deleteQuestion: vi.fn(),
      });

      await act(async () => {
        await result.current.handleDelete("question-1");
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .deleteQuestion,
      ).toHaveBeenCalledWith("question-1", expect.any(Object));

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it("should not delete when user cancels", async () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      const { result } = renderHook(() => useManageQuestions());

      await act(async () => {
        await result.current.handleDelete("question-1");
      });

      expect(
        vi.mocked(useOfflineQuestionsMutation).mock.results[0].value
          .deleteQuestion,
      ).not.toHaveBeenCalled();

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe("form reset", () => {
    it("should reset form to default values", () => {
      const { result } = renderHook(() => useManageQuestions());

      // Set some form data
      act(() => {
        result.current.setFormData({
          text: { en: "Some text" },
          weight: 10,
          categoryName: "Some Category",
          order: 5,
        });
        result.current.setEditingQuestion(mockQuestions[0]);
      });

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
        text: {
          en: "",
          ss: "",
          pt: "",
          zu: "",
          de: "",
          fr: "",
        },
        weight: 5,
        categoryName: "",
        order: 1,
      });
      expect(result.current.editingQuestion).toBeNull();
    });
  });

  describe("dialog management", () => {
    it("should open and close dialog", () => {
      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.isDialogOpen).toBe(false);

      act(() => {
        result.current.setIsDialogOpen(true);
      });

      expect(result.current.isDialogOpen).toBe(true);

      act(() => {
        result.current.setIsDialogOpen(false);
      });

      expect(result.current.isDialogOpen).toBe(false);
    });
  });

  describe("pending state", () => {
    it("should reflect mutation pending state", () => {
      vi.mocked(useOfflineQuestionsMutation).mockReturnValue({
        createQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        deleteQuestion: vi.fn(),
        isPending: true,
      });

      const { result } = renderHook(() => useManageQuestions());

      expect(result.current.isPending).toBe(true);
    });
  });
});
