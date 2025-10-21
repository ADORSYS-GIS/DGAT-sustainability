/**
 * @file Manage Questions page for administrators.
 * @description This page allows administrators to create, edit, and delete questions and assign them to categories.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Settings
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useOfflineQuestions,
  useOfflineQuestionsMutation
} from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "../../hooks/useCategoryCatalogs";
import type {
  CreateQuestionRequest,
  UpdateQuestionRequest
} from "../../openapi-rq/requests/types.gen";
import { offlineDB } from "../../services/indexeddb";
import type { OfflineQuestion } from "../../types/offline";
import CategoryCard from "@/components/pages/admin/ManageQuestions/CategoryCard";
import QuestionForm, { QuestionFormData } from "@/components/pages/admin/ManageQuestions/QuestionForm";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

export const ManageQuestions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingQuestion, setEditingQuestion] =
    useState<OfflineQuestion | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<QuestionFormData>({
    text: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
    weight: 5,
    categoryName: "",
    order: 1,
  });

  useEffect(() => {
    const cleanupTemporaryItems = async () => {
      try {
        const allQuestions = await offlineDB.getAllQuestions();
        const tempQuestions = allQuestions.filter(q => q.question_id.startsWith('temp_'));
        for (const tempQuestion of tempQuestions) {
          await offlineDB.deleteQuestion(tempQuestion.question_id);
        }
        const allCategories = await offlineDB.getAllCategoryCatalogs();
        const tempCategories = allCategories.filter(c => c.category_catalog_id.startsWith('temp_'));
        for (const tempCategory of tempCategories) {
          await offlineDB.deleteCategoryCatalog(tempCategory.category_catalog_id);
        }
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
    cleanupTemporaryItems();
  }, []);

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useOfflineCategoryCatalogs();
  const categories = categoriesData || [];

  const {
    data: questions,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useOfflineQuestions();

 useEffect(() => {
   const handleDataSync = (event: Event) => {
     const customEvent = event as CustomEvent;
     if (customEvent.detail.entityType === 'question') {
       refetchQuestions();
     }
   };

   window.addEventListener('datasync', handleDataSync);
   return () => {
     window.removeEventListener('datasync', handleDataSync);
   };
 }, [refetchQuestions]);

  const { createQuestion, updateQuestion, deleteQuestion, isPending } = useOfflineQuestionsMutation();

  function getErrorMessage(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    return "Unknown error";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.en.trim()) {
      toast.error(t('manageQuestions.textRequired'));
      return;
    }
    if (!formData.categoryName && !selectedCategory) {
      toast.error(t('manageQuestions.categoryRequired'));
      return;
    }
    if (formData.weight < 1 || formData.weight > 10) {
      toast.error(t('manageQuestions.weightRangeError'));
      return;
    }

    const categoryName = selectedCategory || formData.categoryName;
    const category = categories.find((c) => c.name === categoryName);
    if (!category) {
      toast.error("Category not found");
      return;
    }

    const text: Record<string, string> = {};
    for (const code of Object.keys(formData.text)) {
      if (formData.text[code] && formData.text[code].trim()) {
        text[code] = formData.text[code].trim();
      }
    }

    try {
      if (editingQuestion) {
        const updateBody: UpdateQuestionRequest = {
          category_id: category.category_catalog_id,
          text,
          weight: formData.weight,
        };
        await updateQuestion({ questionId: editingQuestion.question_id, question: updateBody });
        toast.success(t('manageQuestions.updateSuccess'));
      } else {
        const createBody: CreateQuestionRequest = {
          category_id: category.category_catalog_id,
          text,
          weight: formData.weight,
        };
        await createQuestion({ ...createBody, order: formData.order });
        toast.success(t('manageQuestions.createSuccess'));
      }
      setIsDialogOpen(false);
      setEditingQuestion(null);
      setSelectedCategory(undefined);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddQuestion = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setEditingQuestion(null);
    const questionCount = (questions || []).filter(q => q.category === categoryName).length;
    setFormData({
      text: LANGUAGES.reduce(
        (acc, lang) => ({ ...acc, [lang.code]: "" }),
        {} as Record<string, string>,
      ),
      weight: 5,
      categoryName: categoryName,
      order: questionCount + 1,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (question: OfflineQuestion) => {
    setEditingQuestion(question);
    setSelectedCategory(undefined);
    const weight = question.latest_revision?.weight || 5;
    const text = question.latest_revision?.text || {};
    
    setFormData({
      text: LANGUAGES.reduce(
        (acc, lang) => {
          acc[lang.code] = text[lang.code] || "";
          return acc;
        },
        {} as Record<string, string>,
      ),
      weight,
      categoryName: question.category,
      order: 1, // Order is not directly editable in this form for now
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm(t('manageQuestions.confirmDelete'))) return;
    try {
      await deleteQuestion(questionId);
      toast.success(t('manageQuestions.deleteSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setEditingQuestion(null);
    setSelectedCategory(undefined);
  }, []);

  const toggleCategoryExpansion = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  if (categoriesLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Categories</h3>
              <p className="text-gray-600 mb-6">{t('manageQuestions.categoriesLoadError')}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["categories"] })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t('manageQuestions.retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="bg-gray-50">
                  {(questions || []).length} Questions
                </Badge>
              </div>
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {t('manageQuestions.title')}
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t('manageQuestions.subtitle')}
              </p>
            </div>
          </div>
          <div className="grid gap-6">
            {categories.map((category) => {
              const categoryQuestions = (questions || [])
                .filter((q) => q.category === category.name)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              
              return (
                <CategoryCard
                  key={category.category_catalog_id}
                  category={category}
                  questions={categoryQuestions}
                  isExpanded={expandedCategories.has(category.name)}
                  onToggle={() => toggleCategoryExpansion(category.name)}
                  onAddQuestion={handleAddQuestion}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              );
            })}
            
            {categories.length === 0 && (
              <Card className="text-center py-12 border shadow-lg bg-white">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Available</h3>
                <p className="text-gray-500">{t('manageQuestions.noCategories')}</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {editingQuestion ? t('manageQuestions.editQuestion') : t('manageQuestions.addNewQuestion')}
            </DialogTitle>
          </DialogHeader>
          <QuestionForm
            categories={categories}
            selectedCategory={selectedCategory}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isPending={isPending}
            editingQuestion={editingQuestion}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
