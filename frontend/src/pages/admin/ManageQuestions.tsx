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
} from "../../../api/generated/queries/queries";
import type {
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from "../../../api/generated/requests/types.gen";

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

  // Fetch questions using OpenAPI-generated hook
  const {
    data: questionsData,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useQuestionsServiceGetQuestions({ category: undefined, limit: 100 });
  const questions: Question[] = useMemo(
    () => questionsData?.questions || [],
    [questionsData],
  );

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

  // Create
  const createMutation = useQuestionsServicePostQuestions({
    onSuccess: () => {
      toast.success("Question created.");
      refetchQuestions();
      setIsDialogOpen(false);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  // Update
  const updateMutation = useQuestionsServicePutQuestionsByQuestionId({
    onSuccess: () => {
      toast.success("Question updated.");
      refetchQuestions();
      setIsDialogOpen(false);
      setEditingQuestion(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  // Delete
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
      const text = {
        en: formData.text_en,
        zu: formData.text_zu || formData.text_en,
      };
      if (editingQuestion) {
        const updateBody: UpdateQuestionRequest = {
          text,
          weight: formData.weight,
        };
        updateMutation.mutate({
          questionId: editingQuestion.questionId,
          requestBody: updateBody,
        });
      } else {
        const createBody: CreateQuestionRequest = {
          category: formData.categoryId,
          text,
          weight: formData.weight,
        };
        createMutation.mutate({ requestBody: createBody });
      }
    },
    [formData, editingQuestion, createMutation, updateMutation],
  );

  const handleEdit = useCallback((question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text_en: question.latestRevision?.text.en || "",
      text_zu: question.latestRevision?.text.zu || "",
      weight: question.latestRevision?.weight || 5,
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
      return questions
        .filter((q) => q.category === categoryId)
        .sort((a, b) => {
          const aOrder = a.latestRevision?.weight || 0;
          const bOrder = b.latestRevision?.weight || 0;
          return aOrder - bOrder;
        });
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
              Manage questions for the Sustainability Assessment
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
              <Accordion type="single" collapsible className="w-full">
                {categories.map((category) => {
                  const categoryQuestions = getQuestionsByCategory(
                    category.categoryId,
                  );
                  return (
                    <AccordionItem
                      key={category.categoryId}
                      value={category.categoryId}
                    >
                      <AccordionTrigger className="text-left">
                        <div>
                          <h3 className="font-medium text-lg">
                            {category.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {categoryQuestions.length} questions
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {categoryQuestions.map((question) => (
                            <div
                              key={question.questionId}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">
                                    {question.latestRevision?.text.en}
                                  </h4>
                                  {question.latestRevision?.text.zu && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {question.latestRevision.text.zu}
                                    </p>
                                  )}
                                  <div className="flex space-x-4 mt-2 text-sm text-gray-500">
                                    <span>
                                      Weight: {question.latestRevision?.weight}
                                    </span>
                                    <span>
                                      Created:{" "}
                                      {new Date(
                                        question.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
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
                                    onClick={() =>
                                      handleDelete(question.questionId)
                                    }
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {categoryQuestions.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No questions in this category yet.</p>
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
                    <p>
                      No categories available. Please create categories first!
                    </p>
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
