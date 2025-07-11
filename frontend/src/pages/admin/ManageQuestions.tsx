import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/shared/Navbar";
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
import { get } from "idb-keyval";
import {
  useQuestionsServiceGetQuestions,
  useQuestionsServicePostQuestions,
  useQuestionsServicePutQuestionsByQuestionId,
  useQuestionsServiceDeleteQuestionsByQuestionId,
  useQuestionsServiceGetQuestionsByQuestionId,
} from "../../openapi-rq/queries/queries";
import type {
  Question,
  QuestionRevision,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionWithRevisionsResponse,
} from "../../openapi-rq/requests/types.gen";

const CATEGORIES_KEY = "sustainability_categories";

interface Category {
  categoryId: string;
  name: string;
  weight: number;
  order: number;
  templateId: string;
}

interface QuestionFormData {
  text_en: string;
  text_zu: string;
  weight: number;
  categoryId: string;
  order: number;
}

const QuestionForm: React.FC<{
  categories: Category[];
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  editingQuestion: Question | null;
}> = ({
  categories,
  formData,
  setFormData,
  onSubmit,
  isPending,
  editingQuestion,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="text_en">Question Text (English)</Label>
        <Textarea
          id="text_en"
          value={formData.text_en}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              text_en: e.target.value,
            }))
          }
          placeholder="e.g., Does your cooperative have a recycling program?"
          required
        />
      </div>
      <div>
        <Label htmlFor="text_zu">Question Text (Zulu - Optional)</Label>
        <Textarea
          id="text_zu"
          value={formData.text_zu}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              text_zu: e.target.value,
            }))
          }
          placeholder="e.g., Ingabe umfelandawonye wakho unomgomo wokugayisa kabusha?"
        />
      </div>
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              categoryId: value,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.categoryId} value={category.categoryId}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">Weight (1-10)</Label>
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
          <Label htmlFor="order">Display Order</Label>
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
          ? "Saving..."
          : editingQuestion
            ? "Update Question"
            : "Create Question"}
      </Button>
    </form>
  );
};

export const ManageQuestions: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>({
    text_en: "",
    text_zu: "",
    weight: 5,
    categoryId: "",
    order: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      const stored = (await get(CATEGORIES_KEY)) as Category[] | undefined;
      setCategories(stored || []);
      setCategoriesLoading(false);
    };
    loadCategories();
  }, []);

  const {
    data: questionsData,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useQuestionsServiceGetQuestions();

  // Helper to extract latest revision for a question
  function getLatestRevision(qwr: QuestionWithRevisionsResponse) {
    if (!qwr.revisions || qwr.revisions.length === 0) return null;
    return qwr.revisions.reduce((a, b) => (a.version > b.version ? a : b));
  }

  // Type guards for API response formats
  function isLatestRevisionQuestion(q: unknown): q is { question_id: string; category: string; created_at: string; latest_revision: { text: Record<string, string>; weight: number; order?: number } } {
    return (
      typeof q === 'object' && q !== null &&
      'latest_revision' in q &&
      typeof (q as { latest_revision?: unknown }).latest_revision === 'object' &&
      (q as { latest_revision?: unknown }).latest_revision !== null
    );
  }
  function isRevisionsQuestion(q: unknown): q is { question: Question; revisions: Array<{ text: string; weight: number; version: number; order?: number }> } {
    return (
      typeof q === 'object' && q !== null &&
      'question' in q && 'revisions' in q &&
      Array.isArray((q as { revisions?: unknown }).revisions)
    );
  }

  // Build questions array with latest revision info for display/edit
  const questions: (Question & { latestText?: Record<string, string>; latestWeight?: number; order?: number })[] = useMemo(
    () =>
      questionsData?.questions?.map((q: unknown) => {
        if (isLatestRevisionQuestion(q)) {
          return {
            question_id: q.question_id,
            category: q.category,
            created_at: q.created_at,
            latestText: q.latest_revision.text,
            latestWeight: q.latest_revision.weight,
            order: q.latest_revision.order,
          };
        }
        if (isRevisionsQuestion(q)) {
          const latest = q.revisions.reduce((a, b) => (a.version > b.version ? a : b), q.revisions[0]);
          return {
            ...q.question,
            latestText: { en: latest.text },
            latestWeight: latest.weight,
            order: latest.order,
          };
        }
        return q as Question;
      }) || [],
    [questionsData],
  );

  // Group questions by categoryId for display
  const questionsByCategory = useMemo(() => {
    const map: Record<string, (Question & { latestText?: Record<string, string>; latestWeight?: number; order?: number })[]> = {};
    questions.forEach((q) => {
      if (!map[q.category]) map[q.category] = [];
      map[q.category].push(q);
    });
    // Sort questions in each category by order if available
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return map;
  }, [questions]);

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

  const createMutation = useQuestionsServicePostQuestions({
    onSuccess: () => {
      toast.success("Question created.");
      refetchQuestions();
      setIsDialogOpen(false);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useQuestionsServicePutQuestionsByQuestionId({
    onSuccess: () => {
      toast.success("Question updated.");
      refetchQuestions();
      setIsDialogOpen(false);
      setEditingQuestion(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useQuestionsServiceDeleteQuestionsByQuestionId({
    onSuccess: () => {
      toast.success("Question deleted.");
      refetchQuestions();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.text_en.trim()) {
        toast.error("Question text (English) is required.");
        return;
      }
      if (!formData.categoryId) {
        toast.error("Category is required.");
        return;
      }
      if (formData.weight < 1 || formData.weight > 10) {
        toast.error("Weight must be between 1 and 10.");
        return;
      }
      const text: Record<string, string> = { en: formData.text_en };
      if (formData.text_zu) text["zu"] = formData.text_zu;
      if (editingQuestion) {
        // Update expects a string for text (English only)
        const updateBody: UpdateQuestionRequest = {
          text: formData.text_en,
        };
        updateMutation.mutate({
          questionId: editingQuestion.question_id,
          requestBody: updateBody,
        });
      } else {
        // Create expects an object for text and a number for weight
        const createBody: CreateQuestionRequest = {
          category: formData.categoryId, // send exact categoryId from form
          text,
          weight: Number(formData.weight),
        };
        createMutation.mutate({ requestBody: createBody });
      }
    },
    [formData, editingQuestion, createMutation, updateMutation],
  );

  const handleEdit = useCallback((question: Question & { latestText?: Record<string, string>; latestWeight?: number }) => {
    setEditingQuestion(question);
    setFormData({
      text_en: question.latestText?.en || "",
      text_zu: question.latestText?.zu || "",
      weight: question.latestWeight || 5,
      categoryId: question.category,
      order: 1,
    });
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (questionId: string) => {
      if (!window.confirm("Are you sure you want to delete this question?"))
        return;
      deleteMutation.mutate({ questionId });
    },
    [deleteMutation],
  );

  const getQuestionsByCategory = useCallback(
    (categoryId: string) => {
      return questions.filter((q) => q && q.category === categoryId);
    },
    [questions],
  );

  if (categoriesLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Manage Questions
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Create and edit questions within each assessment category
            </p>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sustainability Assessment Questions</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-dgrv-blue hover:bg-blue-700"
                    onClick={() => {
                      setEditingQuestion(null);
                      setFormData({
                        text_en: "",
                        text_zu: "",
                        weight: 5,
                        categoryId: categories[0]?.categoryId || "",
                        order: questions.length + 1,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuestion ? "Edit Question" : "Add New Question"}
                    </DialogTitle>
                  </DialogHeader>
                  <QuestionForm
                    categories={categories}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    isPending={
                      createMutation.isPending || updateMutation.isPending
                    }
                    editingQuestion={editingQuestion}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Accordion for collapsible categories, first expanded by default */}
              <Accordion type="multiple" defaultValue={[categories[0]?.categoryId]} className="w-full">
                {categories.map((cat) => {
                  const catQuestions = questionsByCategory[cat.categoryId] || [];
                  return (
                    <AccordionItem key={cat.categoryId} value={cat.categoryId}>
                      <AccordionTrigger className="text-left font-semibold text-lg mt-6">
                        {cat.name}
                      </AccordionTrigger>
                      {/* Number of questions under the category name */}
                      <div className="text-sm text-gray-600 mb-2 ml-4">
                        {catQuestions.length} question{catQuestions.length !== 1 ? 's' : ''}
                      </div>
                      <AccordionContent>
                        {catQuestions.length === 0 && (
                          <div className="text-gray-400 italic mb-4">No questions</div>
                        )}
                        {catQuestions.map((question) => (
                          <div
                            key={question.question_id}
                            className="border rounded-lg p-4 mb-4 flex justify-between items-start bg-white"
                          >
                            <div className="flex-1">
                              {/* English text in bold */}
                              {question.latestText?.en && (
                                <div className="font-semibold text-base mb-1">
                                  {question.latestText.en}
                                </div>
                              )}
                              {/* Zulu or other language text in smaller, lighter font */}
                              {question.latestText?.zu && (
                                <div className="text-sm text-gray-600 mb-1">
                                  {question.latestText.zu}
                                </div>
                              )}
                              {/* Weight and Order */}
                              <div className="text-xs text-gray-500">
                                Weight: {question.latestWeight ?? '-'}
                                {typeof question.order === 'number' && (
                                  <span className="ml-4">Order: {question.order}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(question)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(question.question_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const QuestionRevisionText: React.FC<{ questionId: string }> = ({
  questionId,
}) => {
  const { data } = useQuestionsServiceGetQuestionsByQuestionId({ questionId });
  if (!data || !data.revisions || data.revisions.length === 0)
    return <em>No text</em>;
  const latest = data.revisions.reduce((a, b) =>
    a.version > b.version ? a : b,
  );
  if (latest.language === "en") return <>{latest.text}</>;
  return <>{latest.text}</>;
};
