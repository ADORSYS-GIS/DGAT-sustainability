import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { 
  useOfflineQuestions, 
  useOfflineCategories, 
  useOfflineQuestionsMutation,
  useOfflineSyncStatus
} from "../../hooks/useOfflineApi";
import type {
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from "../../openapi-rq/requests/types.gen";
import { useState as useLocalState } from "react";
import { offlineDB } from "../../services/indexeddb";

// Extended types to match actual API response
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

// Updated Category interface to match API response
interface Category {
  category_id: string;
  name: string;
  weight: number;
  order: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ss", name: "siSwati", flag: "🇸🇿" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
];

interface QuestionFormData {
  text: Record<string, string>;
  weight: number;
  categoryName: string;
  order: number;
}

const QuestionForm: React.FC<{
  categories: Category[];
  
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingQuestion: QuestionWithLatestRevision | null;
  isOnline: boolean;
}> = ({
  categories,
  formData,
  setFormData,
  onSubmit,
  isPending,
  editingQuestion,
  isOnline,
}) => {
  // Track which language dropdown is open (only one at a time)
  const [openLang, setOpenLang] = useLocalState<string | null>(null);
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* English always visible */}
      <div>
        <Label htmlFor="text_en">🇺🇸 English (Required)</Label>
        <Textarea
          id="text_en"
          value={formData.text["en"] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              text: { ...prev.text, en: e.target.value },
            }))
          }
          placeholder={t('manageQuestions.questionEnPlaceholder')}
          required
        />
      </div>
      {/* Other languages as dropdowns */}
      <div className="space-y-2">
        {LANGUAGES.filter((lang) => lang.code !== "en").map((lang) => (
          <Select
            key={lang.code}
            open={openLang === lang.code}
            onOpenChange={(isOpen) => setOpenLang(isOpen ? lang.code : null)}
            value={openLang === lang.code ? lang.code : ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={lang.name}>{lang.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Label htmlFor={`text_${lang.code}`}>{lang.name}</Label>
                <Textarea
                  id={`text_${lang.code}`}
                  value={formData.text[lang.code] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      text: { ...prev.text, [lang.code]: e.target.value },
                    }))
                  }
                  placeholder={t('manageQuestions.questionLangPlaceholder', { lang: lang.name })}
                />
              </div>
            </SelectContent>
          </Select>
        ))}
      </div>
      <div>
        <Label htmlFor="categoryName">{t('manageQuestions.category')}</Label>
        <Select
          value={formData.categoryName}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              categoryName: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('manageQuestions.selectCategoryPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.category_id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">{t('manageQuestions.weightLabel')}</Label>
          <Input
            id="weight"
            type="number"
            min="1"
            max="10"
            value={formData.weight}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                weight: parseInt(e.target.value) || 1,
              }))
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="order">{t('manageQuestions.displayOrder')}</Label>
          <Input
            id="order"
            type="number"
            min="1"
            value={formData.order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 1,
              }))
            }
            required
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-dgrv-blue hover:bg-blue-700"
        disabled={isPending}
      >
        {isPending
          ? t('manageQuestions.saving')
          : editingQuestion
            ? t('manageQuestions.updateQuestion')
            : t('manageQuestions.createQuestion')}
      </Button>
    </form>
  );
};

export const ManageQuestions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionWithLatestRevision | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    text: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
    weight: 5,
    categoryName: "",
    order: 1,
  });

  // Cleanup function to remove any stuck temporary items
  useEffect(() => {
    const cleanupTemporaryItems = async () => {
      try {
        console.log('🔍 Cleaning up temporary items...');
        
        // Clean up temporary questions
        const allQuestions = await offlineDB.getAllQuestions();
        const tempQuestions = allQuestions.filter(q => q.question_id.startsWith('temp_'));
        console.log('🔍 Found temporary questions:', tempQuestions.length);
        
        for (const tempQuestion of tempQuestions) {
          console.log('🔍 Deleting temporary question:', tempQuestion.question_id);
          await offlineDB.deleteQuestion(tempQuestion.question_id);
        }
        
        // Clean up temporary categories
        const allCategories = await offlineDB.getAllCategories();
        const tempCategories = allCategories.filter(c => c.category_id.startsWith('temp_'));
        console.log('🔍 Found temporary categories:', tempCategories.length);
        
        for (const tempCategory of tempCategories) {
          console.log('🔍 Deleting temporary category:', tempCategory.category_id);
          await offlineDB.deleteCategory(tempCategory.category_id);
        }
        
        console.log('🔍 Cleanup completed');
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
      }
    };

    cleanupTemporaryItems();
  }, []);

  // Use offline hooks for all data fetching
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

  // Cast the response to match the actual API structure
  const questions = (questionsData?.questions || []) as QuestionWithLatestRevision[];

  // Use enhanced offline mutation hooks
  const { createQuestion, updateQuestion, deleteQuestion, isPending } = useOfflineQuestionsMutation();
  const { isOnline } = useOfflineSyncStatus();

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.text.en.trim()) {
        toast.error(t('manageQuestions.textRequired'));
        return;
      }
      if (!formData.categoryName) {
        toast.error(t('manageQuestions.categoryRequired'));
        return;
      }
      if (formData.weight < 1 || formData.weight > 10) {
        toast.error(t('manageQuestions.weightRangeError'));
        return;
      }
      // Remove empty language fields
      const text: Record<string, string> = {};
      for (const code of Object.keys(formData.text)) {
        if (formData.text[code] && formData.text[code].trim()) {
          text[code] = formData.text[code].trim();
        }
      }
      if (editingQuestion) {
        const updateBody: UpdateQuestionRequest = {
          category: formData.categoryName,
          text,
          weight: formData.weight,
        };
        await updateQuestion(editingQuestion.question_id, updateBody, {
          onSuccess: () => {
            toast.success(t('manageQuestions.updateSuccess'));
            refetchQuestions();
            setIsDialogOpen(false);
            setEditingQuestion(null);
          },
          onError: (error: unknown) => toast.error(getErrorMessage(error)),
        });
      } else {
        const createBody: CreateQuestionRequest = {
          category: formData.categoryName,
          text,
          weight: formData.weight,
        };
        await createQuestion(createBody, {
          onSuccess: () => {
            toast.success(t('manageQuestions.createSuccess'));
            refetchQuestions();
            setIsDialogOpen(false);
          },
          onError: (error: unknown) => toast.error(getErrorMessage(error)),
        });
      }
    },
    [formData, editingQuestion, createQuestion, updateQuestion, refetchQuestions, setIsDialogOpen, setEditingQuestion, t],
  );

  const handleEdit = useCallback((question: QuestionWithLatestRevision) => {
    setEditingQuestion(question);
    const weight = question.latest_revision?.weight || 5;
    const text: Record<string, string> = LANGUAGES.reduce(
      (acc, lang) => {
        acc[lang.code] = question.latest_revision?.text[lang.code] || "";
        return acc;
      },
      {} as Record<string, string>,
    );
    setFormData({
      text,
      weight,
      categoryName: question.category,
      order: 1,
    });
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (questionId: string) => {
      if (!window.confirm(t('manageQuestions.confirmDelete')))
        return;
      
      await deleteQuestion(questionId, {
        onSuccess: () => {
          toast.success(t('manageQuestions.deleteSuccess'));
          refetchQuestions();
        },
        onError: (error: unknown) => toast.error(getErrorMessage(error)),
      });
    },
    [deleteQuestion, refetchQuestions, t],
  );

  const getQuestionsByCategory = useCallback(
    (categoryId: string) => {
      return questions
        .filter((q: QuestionWithLatestRevision) => q.category === categoryId)
        .sort((a, b) => 0);
    },
    [questions],
  );

  if (categoriesLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  // Show error if categories failed to load
  if (categoriesError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-8 text-red-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('manageQuestions.categoriesLoadError')}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["categories"] })}
                className="mt-4 bg-dgrv-blue hover:bg-blue-700"
              >
                {t('manageQuestions.retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check for questions data
  if (!questions || !Array.isArray(questions)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No questions data available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t('manageQuestions.title')}
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              {t('manageQuestions.subtitle')}
            </p>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('manageQuestions.cardTitle')}</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-blue hover:bg-blue-700"
                    onClick={() => {
                      setEditingQuestion(null);
                      setFormData({
                        text: LANGUAGES.reduce(
                          (acc, lang) => ({ ...acc, [lang.code]: "" }),
                          {} as Record<string, string>,
                        ),
                        weight: 5,
                        categoryName: categories[0]?.name || "",
                        order: questions.length + 1,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('manageQuestions.addQuestion')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuestion ? t('manageQuestions.editQuestion') : t('manageQuestions.addNewQuestion')}
                    </DialogTitle>
                  </DialogHeader>
                  <QuestionForm
                    categories={categories}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    editingQuestion={editingQuestion}
                    isOnline={true}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {categories.map((category) => {
                  const categoryQuestions = questions.filter(
                    (q) => q.category === category.name,
                  );
                  return (
                    <AccordionItem
                      key={category.category_id}
                      value={category.category_id}
                    >
                      <AccordionTrigger className="text-left text-xl font-bold text-dgrv-blue">
                        {category.name}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {categoryQuestions.length > 0 ? (
                            categoryQuestions.map((question) => (
                              <div
                                key={question.question_id}
                                className="border rounded-lg p-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="mb-2">
                                      <QuestionText question={question} />
                                    </div>
                                    <div className="flex space-x-4 text-sm text-gray-600">
                                      {question.latest_revision && (
                                        <span>
                                          <strong>Weight:</strong>{" "}
                                          {question.latest_revision.weight}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 ml-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(question)}
                                      disabled={false}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {question.latest_revision &&
                                      question.latest_revision
                                        .question_revision_id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleDelete(
                                              question.question_id,
                                            )
                                          }
                                          disabled={false}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>{t('manageQuestions.noQuestionsInCategory')}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('manageQuestions.noCategories')}</p>
                  </div>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const QuestionText = ({
  question,
}: {
  question: QuestionWithLatestRevision;
}) => {
  const { t } = useTranslation();
  if (!question.latest_revision || !question.latest_revision.text) {
    return <em>{t('manageQuestions.noText')}</em>;
  }

  const text = question.latest_revision.text;
  const languages = Object.keys(text);

  if (languages.length === 0) {
    return <em>{t('manageQuestions.noText')}</em>;
  }

  return (
    <div className="space-y-2">
      {languages.map((lang) => {
        const langText = text[lang];
        if (!langText) return null;

        return (
          <div key={lang} className="text-sm">
            <span className="font-medium text-gray-600 uppercase">
              {t(`languages.${lang}`)}:
            </span>{" "}
            <span className="text-gray-800">{langText}</span>
          </div>
        );
      })}
    </div>
  );
};
