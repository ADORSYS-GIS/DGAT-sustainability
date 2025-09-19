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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  Settings,
  Globe,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Target,
  Layers,
} from "lucide-react";
import {
  useOfflineQuestions,
  useOfflineCategories,
  useOfflineQuestionsMutation,
  useOfflineSyncStatus,
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
  selectedCategory?: string;
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingQuestion: QuestionWithLatestRevision | null;
  onCancel: () => void;
}> = ({
  categories,
  selectedCategory,
  formData,
  setFormData,
  onSubmit,
  isPending,
  editingQuestion,
  onCancel,
}) => {
  // Track which language dropdown is open (only one at a time)
  const [openLang, setOpenLang] = useLocalState<string | null>(null);
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {editingQuestion
            ? t("manageQuestions.editQuestion")
            : t("manageQuestions.addNewQuestion")}
        </h3>
        {selectedCategory && (
          <p className="text-sm text-gray-500 mt-1">
            Adding to category:{" "}
            <span className="font-medium text-blue-600">
              {selectedCategory}
            </span>
          </p>
        )}
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          {t("manageQuestions.category")}{" "}
          <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.categoryName}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              categoryName: value,
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t("manageQuestions.selectCategoryPlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.category_id} value={category.name}>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question Text - English (Required) */}
      <div className="space-y-2">
        <Label htmlFor="text_en" className="text-sm font-medium text-gray-700">
          🇺🇸 English Question <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="text_en"
          value={formData.text["en"] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              text: { ...prev.text, en: e.target.value },
            }))
          }
          placeholder="Enter the question in English..."
          className="min-h-[100px] resize-none"
          required
        />
      </div>

      {/* Other Languages */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span>Additional Languages (Optional)</span>
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LANGUAGES.filter((lang) => lang.code !== "en").map((lang) => (
            <div key={lang.code} className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </Label>
              <Textarea
                id={`text_${lang.code}`}
                value={formData.text[lang.code] || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    text: { ...prev.text, [lang.code]: e.target.value },
                  }))
                }
                placeholder={`Enter the question in ${lang.name}...`}
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Weight and Order */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="weight"
            className="text-sm font-medium text-gray-700 flex items-center space-x-1"
          >
            <Target className="w-4 h-4" />
            <span>{t("manageQuestions.weightLabel")}</span>
          </Label>
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
            className="text-center"
            required
          />
          <p className="text-xs text-gray-500">
            Higher weight = more important
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="order" className="text-sm font-medium text-gray-700">
            {t("manageQuestions.displayOrder")}
          </Label>
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
            className="text-center"
            required
          />
          <p className="text-xs text-gray-500">Display sequence</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={isPending}
        >
          {isPending ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>
                {editingQuestion ? "Update Question" : "Create Question"}
              </span>
            </div>
          )}
        </Button>
      </div>
    </form>
  );
};

export const ManageQuestions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionWithLatestRevision | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState<QuestionFormData>({
    text: LANGUAGES.reduce(
      (acc, lang) => ({ ...acc, [lang.code]: "" }),
      {} as Record<string, string>,
    ),
    weight: 5,
    categoryName: "",
    order: 1,
  });

  // Clean up temporary items on component mount
  useEffect(() => {
    const cleanupTemporaryItems = async () => {
      try {
        // Clean up temporary questions
        const allQuestions = await offlineDB.getAllQuestions();
        const tempQuestions = allQuestions.filter((q) =>
          q.question_id.startsWith("temp_"),
        );

        for (const tempQuestion of tempQuestions) {
          await offlineDB.deleteQuestion(tempQuestion.question_id);
        }

        // Clean up temporary categories
        const allCategories = await offlineDB.getAllCategories();
        const tempCategories = allCategories.filter((c) =>
          c.category_id.startsWith("temp_"),
        );

        for (const tempCategory of tempCategories) {
          await offlineDB.deleteCategory(tempCategory.category_id);
        }
      } catch (error) {
        // Silently handle cleanup errors
      }
    };

    cleanupTemporaryItems();
  }, []);

  // Use offline hooks for all data fetching
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useOfflineCategories();

  const categories = categoriesData?.categories || [];

  const {
    data: questionsData,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useOfflineQuestions();

  // Cast the response to match the actual API structure
  const questions = (questionsData?.questions ||
    []) as QuestionWithLatestRevision[];

  // Use enhanced offline mutation hooks
  const { createQuestion, updateQuestion, deleteQuestion, isPending } =
    useOfflineQuestionsMutation();

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
        toast.error(t("manageQuestions.textRequired"));
        return;
      }
      if (!formData.categoryName && !selectedCategory) {
        toast.error(t("manageQuestions.categoryRequired"));
        return;
      }
      if (formData.weight < 1 || formData.weight > 10) {
        toast.error(t("manageQuestions.weightRangeError"));
        return;
      }

      // Use selected category if available, otherwise use form category
      const categoryName = selectedCategory || formData.categoryName;

      // Remove empty language fields
      const text: Record<string, string> = {};
      for (const code of Object.keys(formData.text)) {
        if (formData.text[code] && formData.text[code].trim()) {
          text[code] = formData.text[code].trim();
        }
      }

      if (editingQuestion) {
        const updateBody: UpdateQuestionRequest = {
          category: categoryName,
          text,
          weight: formData.weight,
        };
        await updateQuestion(editingQuestion.question_id, updateBody, {
          onSuccess: () => {
            toast.success(t("manageQuestions.updateSuccess"));
            refetchQuestions();
            setIsDialogOpen(false);
            setEditingQuestion(null);
            setSelectedCategory(undefined);
          },
          onError: (error: unknown) => toast.error(getErrorMessage(error)),
        });
      } else {
        const createBody: CreateQuestionRequest = {
          category: categoryName,
          text,
          weight: formData.weight,
        };
        await createQuestion(createBody, {
          onSuccess: () => {
            toast.success(t("manageQuestions.createSuccess"));
            refetchQuestions();
            setIsDialogOpen(false);
            setSelectedCategory(undefined);
          },
          onError: (error: unknown) => toast.error(getErrorMessage(error)),
        });
      }
    },
    [
      formData,
      editingQuestion,
      selectedCategory,
      createQuestion,
      updateQuestion,
      refetchQuestions,
      setIsDialogOpen,
      setEditingQuestion,
      setSelectedCategory,
      t,
    ],
  );

  const handleAddQuestion = useCallback(
    (categoryName: string) => {
      setSelectedCategory(categoryName);
      setEditingQuestion(null);
      setFormData({
        text: LANGUAGES.reduce(
          (acc, lang) => ({ ...acc, [lang.code]: "" }),
          {} as Record<string, string>,
        ),
        weight: 5,
        categoryName: categoryName,
        order: questions.filter((q) => q.category === categoryName).length + 1,
      });
      setIsDialogOpen(true);
    },
    [questions],
  );

  const handleEdit = useCallback((question: QuestionWithLatestRevision) => {
    setEditingQuestion(question);
    setSelectedCategory(undefined);
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
      if (!window.confirm(t("manageQuestions.confirmDelete"))) return;

      await deleteQuestion(questionId, {
        onSuccess: () => {
          toast.success(t("manageQuestions.deleteSuccess"));
          refetchQuestions();
        },
        onError: (error: unknown) => toast.error(getErrorMessage(error)),
      });
    },
    [deleteQuestion, refetchQuestions, t],
  );

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setEditingQuestion(null);
    setSelectedCategory(undefined);
  }, []);

  const toggleCategoryExpansion = useCallback((categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  const getQuestionsByCategory = useCallback(
    (categoryName: string) => {
      return questions
        .filter((q: QuestionWithLatestRevision) => q.category === categoryName)
        .sort(
          (a, b) =>
            (a.latest_revision?.weight || 0) - (b.latest_revision?.weight || 0),
        );
    },
    [questions],
  );

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

  // Show error if categories failed to load
  if (categoriesError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load Categories
              </h3>
              <p className="text-gray-600 mb-6">
                {t("manageQuestions.categoriesLoadError")}
              </p>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["categories"] })
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t("manageQuestions.retry")}
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
      <div className="min-h-screen bg-white">
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Questions Available
              </h3>
              <p className="text-gray-600">No questions data available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            {/* Questions Count */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="bg-gray-50">
                  {questions.length} Questions
                </Badge>
              </div>
            </div>

            {/* Title Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {t("manageQuestions.title")}
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t("manageQuestions.subtitle")}
              </p>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid gap-6">
            {categories.map((category) => {
              const categoryQuestions = getQuestionsByCategory(category.name);
              const questionCount = categoryQuestions.length;

              return (
                <Card
                  key={category.category_id}
                  className="overflow-hidden border shadow-lg bg-white"
                >
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                          <Layers className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-gray-900">
                            {category.name}
                          </CardTitle>
                          <div className="flex items-center space-x-3 mt-1">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800"
                            >
                              {questionCount}{" "}
                              {questionCount === 1 ? "Question" : "Questions"}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Weight: {category.weight}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategoryExpansion(category.name)}
                          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                        >
                          {expandedCategories.has(category.name) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleAddQuestion(category.name)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {expandedCategories.has(category.name) && (
                      <>
                        {questionCount > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {categoryQuestions.map((question, index) => (
                              <div
                                key={question.question_id}
                                className="p-6 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-start space-x-3">
                                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium text-gray-600 mt-1">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1">
                                        <QuestionText question={question} />
                                        <div className="flex items-center space-x-4 mt-3">
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Weight:{" "}
                                            {question.latest_revision?.weight ||
                                              5}
                                          </Badge>
                                          <span className="text-xs text-gray-500">
                                            {new Date(
                                              question.created_at,
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(question)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDelete(question.question_id)
                                      }
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                              <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Questions Yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                              {t("manageQuestions.noQuestionsInCategory")}
                            </p>
                            <Button
                              onClick={() => handleAddQuestion(category.name)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Question
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {categories.length === 0 && (
              <Card className="text-center py-12 border shadow-lg bg-white">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Categories Available
                </h3>
                <p className="text-gray-500">
                  {t("manageQuestions.noCategories")}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Question Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {editingQuestion
                ? t("manageQuestions.editQuestion")
                : t("manageQuestions.addNewQuestion")}
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

const QuestionText = ({
  question,
}: {
  question: QuestionWithLatestRevision;
}) => {
  const { t } = useTranslation();
  if (!question.latest_revision || !question.latest_revision.text) {
    return <em className="text-gray-500">{t("manageQuestions.noText")}</em>;
  }

  const text = question.latest_revision.text;
  const languages = Object.keys(text).filter(
    (lang) => text[lang] && text[lang].trim(),
  );

  if (languages.length === 0) {
    return <em className="text-gray-500">{t("manageQuestions.noText")}</em>;
  }

  return (
    <div className="space-y-3">
      {/* Primary language (English) */}
      {text.en && (
        <div className="space-y-1">
          <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
            <span>🇺🇸</span>
            <span>English</span>
          </span>
          <p className="text-gray-900 leading-relaxed">{text.en}</p>
        </div>
      )}

      {/* Other languages */}
      {languages
        .filter((lang) => lang !== "en")
        .map((lang) => {
          const langText = text[lang];
          if (!langText) return null;

          const langInfo = LANGUAGES.find((l) => l.code === lang);

          return (
            <div key={lang} className="space-y-1">
              <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                <span>{langInfo?.flag || "🌐"}</span>
                <span>{langInfo?.name || lang}</span>
              </span>
              <p className="text-gray-700 leading-relaxed text-sm">
                {langText}
              </p>
            </div>
          );
        })}
    </div>
  );
};
