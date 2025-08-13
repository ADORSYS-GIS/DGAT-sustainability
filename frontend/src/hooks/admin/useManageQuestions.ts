import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { 
  useOfflineQuestions, 
  useOfflineCategories, 
  useOfflineQuestionsMutation,
  useOfflineSyncStatus
} from "@/hooks/useOfflineApi";
import { offlineDB } from "@/services/indexeddb";

interface QuestionRevision {
  question_revision_id: string;
  question_id: string;
  text: Record<string, string>;
  weight: number;
  created_at: string;
}

interface QuestionWithLatestRevision {
  question_id: string;
  category: string;
  created_at: string;
  latest_revision: QuestionRevision;
}

interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface QuestionFormData {
  text: Record<string, string>;
  weight: number;
  categoryName: string;
  order: number;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

export const useManageQuestions = () => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithLatestRevision | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    text: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
    weight: 5,
    categoryName: "",
    order: 1,
  });

  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    error: categoriesError 
  } = useOfflineCategories();

  const categories = categoriesData?.categories || [];

  const { 
    data: questionsData,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useOfflineQuestions();

  const questions = (questionsData?.questions || []) as QuestionWithLatestRevision[];

  const { createQuestion, updateQuestion, deleteQuestion, isPending } = useOfflineQuestionsMutation();
  const { isOnline } = useOfflineSyncStatus();

  useEffect(() => {
    const cleanupTemporaryItems = async () => {
      try {
        const allQuestions = await offlineDB.getAllQuestions();
        const tempQuestions = allQuestions.filter(q => q.question_id.startsWith('temp_'));
        
        for (const tempQuestion of tempQuestions) {
          await offlineDB.deleteQuestion(tempQuestion.question_id);
        }
        
        const allCategories = await offlineDB.getAllCategories();
        const tempCategories = allCategories.filter(c => c.category_id.startsWith('temp_'));
        
        for (const tempCategory of tempCategories) {
          await offlineDB.deleteCategory(tempCategory.category_id);
        }
      } catch (error) {
        // Silently handle cleanup errors
      }
    };

    cleanupTemporaryItems();
  }, []);

  function getErrorMessage(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    return t('manageQuestions.unknownError', { defaultValue: 'An unknown error occurred' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryName.trim()) {
      toast.error(t('manageQuestions.categoryRequired', { defaultValue: 'Category is required' }));
      return;
    }

    const hasText = Object.values(formData.text).some(text => text.trim());
    if (!hasText) {
      toast.error(t('manageQuestions.textRequired', { defaultValue: 'Question text is required in at least one language' }));
      return;
    }

    if (editingQuestion) {
      await updateQuestion(editingQuestion.question_id, {
        category: formData.categoryName,
        text: formData.text,
        weight: formData.weight,
      }, {
        onSuccess: () => {
          toast.success(t('manageQuestions.updateSuccess', { defaultValue: 'Question updated successfully' }));
          setIsDialogOpen(false);
          setEditingQuestion(null);
          resetForm();
          refetchQuestions();
        },
        onError: (error) => {
          toast.error(t('manageQuestions.updateError', { defaultValue: 'Failed to update question' }));
        }
      });
    } else {
      await createQuestion({
        category: formData.categoryName,
        text: formData.text,
        weight: formData.weight,
      }, {
        onSuccess: () => {
          toast.success(t('manageQuestions.createSuccess', { defaultValue: 'Question created successfully' }));
          setIsDialogOpen(false);
          resetForm();
          refetchQuestions();
        },
        onError: (error) => {
          toast.error(t('manageQuestions.createError', { defaultValue: 'Failed to create question' }));
        }
      });
    }
  };

  const handleEdit = (question: QuestionWithLatestRevision) => {
    setEditingQuestion(question);
    setFormData({
      text: question.latest_revision.text,
      weight: question.latest_revision.weight,
      categoryName: question.category,
      order: 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm(t('manageQuestions.confirmDelete', { defaultValue: 'Are you sure you want to delete this question?' }))) {
      return;
    }

    await deleteQuestion(questionId, {
      onSuccess: () => {
        toast.success(t('manageQuestions.deleteSuccess', { defaultValue: 'Question deleted successfully' }));
        refetchQuestions();
      },
      onError: (error) => {
        toast.error(t('manageQuestions.deleteError', { defaultValue: 'Failed to delete question' }));
      }
    });
  };

  const resetForm = () => {
    setFormData({
      text: LANGUAGES.reduce(
        (acc, lang) => ({ ...acc, [lang.code]: "" }),
        {} as Record<string, string>,
      ),
      weight: 5,
      categoryName: "",
      order: 1,
    });
    setEditingQuestion(null);
  };

  return {
    // State
    isDialogOpen,
    setIsDialogOpen,
    editingQuestion,
    setEditingQuestion,
    formData,
    setFormData,
    
    // Data
    categories,
    questions,
    isLoading: categoriesLoading || questionsLoading,
    error: categoriesError,
    isOnline,
    
    // Functions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    refetchQuestions,
    
    // Computed
    isPending,
  };
}; 