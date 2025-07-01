import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/shared/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  CheckCircle,
  Paperclip,
  Info,
} from "lucide-react";
import { Category } from "@/services/user/categoryService";
import { Question } from "@/services/user/questionService";
import { Assessment as AssessmentType } from "@/services/user/assessmentService";
import { useCategoriesByTemplate } from "@/hooks/user/useCategoriesByTemplate";
import { useQuestionsByTemplate } from "@/hooks/user/useQuestionsByTemplate";
import {
  createAssessment,
  updateAssessment,
} from "@/services/user/assessmentService";
import { useMutation } from "@tanstack/react-query";

type FileData = { name: string; url: string };

export const Assessment: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { yesNo?: boolean; percentage?: number; text?: string; files?: FileData[] }>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<AssessmentType | null>(null);
  const [showPercentInfo, setShowPercentInfo] = useState(false);

  const templateId = "sustainability_template";
  const toolName = "Sustainability Assessment";

  // Fetch categories and questions
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategoriesByTemplate(templateId);
  const {
    data: questionsData,
    isLoading: questionsLoading,
    error: questionsError,
  } = useQuestionsByTemplate(templateId);

  // Create assessment on mount (if user and data loaded)
  useEffect(() => {
    if (categoriesData && questionsData && !assessment) {
      const create = async () => {
        try {
          const newAssessment = await createAssessment({
            userId: 'public',
            organizationId: 'public',
            templateId,
            answers: {},
            status: "draft",
          });
          setAssessment(newAssessment);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create assessment",
            variant: "destructive",
          });
        }
      };
      create();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesData, questionsData]);

  // Filter and sort categories
  const categories: Category[] = React.useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData
      .sort((a, b) => a.order - b.order);
  }, [categoriesData]);

  // Sort questions
  const questions: Question[] = React.useMemo(() => {
    if (!questionsData) return [];
    return questionsData.sort((a, b) => a.order - b.order);
  }, [questionsData]);

  const getCurrentCategoryQuestions = () => {
    if (!categories[currentCategoryIndex]) return [];
    return questions.filter(
      (q) => q.categoryId === categories[currentCategoryIndex].categoryId
    );
  };

  // Mutations
  const updateAssessmentMutation = useMutation({
    mutationFn: updateAssessment,
    onSuccess: (data) => {
      setAssessment(data);
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved",
        className: "bg-dgrv-green text-white",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    },
  });

  const handleAnswerChange = (questionId: string, value: { yesNo?: boolean; percentage?: number; text?: string; files?: FileData[] }) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [questionId]: comment }));
  };

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        url: e.target?.result as string,
      };
      setAnswers((prev) => {
        const prevFiles = prev[questionId]?.files || [];
        return {
          ...prev,
          [questionId]: {
            ...prev[questionId],
            files: [...prevFiles, fileData],
          },
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const saveDraft = async () => {
    if (!assessment) return;
    updateAssessmentMutation.mutate({
      ...assessment,
      answers: { ...answers, comments },
    });
  };

  const submitAssessment = async () => {
    if (!assessment) return;
    // For now, just update status to submitted (score logic can be added if backend supports it)
    updateAssessmentMutation.mutate({
      ...assessment,
      answers: { ...answers, comments },
      status: "submitted",
    });
    toast({
      title: "Assessment Submitted!",
      description: `Your ${toolName.toLowerCase()} has been submitted successfully`,
      className: "bg-dgrv-green text-white",
    });
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const nextCategory = async () => {
    await saveDraft();
    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const yesNoValue = answers[question.questionId]?.yesNo;
    const percentageValue = answers[question.questionId]?.percentage;
    const textValue = answers[question.questionId]?.text || "";
    const comment = comments[question.questionId] || "";
    const files = answers[question.questionId]?.files || [];
    return (
      <div className="space-y-4">
        {/* Yes/No */}
        <div>
          <Label>Yes/No</Label>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""
              }
              onClick={() =>
                handleAnswerChange(question.questionId, {
                  ...answers[question.questionId],
                  yesNo: true,
                })
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""
              }
              onClick={() =>
                handleAnswerChange(question.questionId, {
                  ...answers[question.questionId],
                  yesNo: false,
                })
              }
            >
              No
            </Button>
          </div>
        </div>
        {/* Percentage */}
        <div>
          <div className="flex items-center space-x-2 relative">
            <Label>Percentage</Label>
            <button
              type="button"
              className="cursor-pointer text-dgrv-blue focus:outline-none"
              onClick={() => setShowPercentInfo((prev) => !prev)}
              aria-label="Show percentage explanation"
            >
              <Info className="w-4 h-4" />
            </button>
            {showPercentInfo && (
              <div className="absolute left-8 top-6 z-10 bg-white border rounded shadow-md p-3 w-56 text-xs text-gray-700">
                <div><b>0%:</b> Not started</div>
                <div><b>25%:</b> Some progress</div>
                <div><b>50%:</b> Halfway</div>
                <div><b>75%:</b> Almost done</div>
                <div><b>100%:</b> Fully achieved</div>
              </div>
            )}
          </div>
          <div className="flex space-x-2 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-dgrv-blue text-white border-dgrv-blue"
                    : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
                }
                onClick={() =>
                  handleAnswerChange(question.questionId, {
                    ...answers[question.questionId],
                    percentage: val,
                  })
                }
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        {/* Text Input */}
        <div>
          <Label htmlFor={`input-text-${question.questionId}`}>
            Your Response
          </Label>
          <Textarea
            id={`input-text-${question.questionId}`}
            value={textValue}
            onChange={(e) =>
              handleAnswerChange(question.questionId, {
                ...answers[question.questionId],
                text: e.target.value,
              })
            }
            placeholder="Enter your response..."
            className="mt-1"
            rows={4}
          />
          {/* File Upload */}
          <div className="mt-2 flex items-center space-x-2">
            <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>Add file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(question.questionId, e.target.files)}
              />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file: FileData, idx: number) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                    download={file.name}
                  >
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (categoriesLoading || questionsLoading || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-dgrv-blue mb-4">
                  Assessment Not Available
                </h2>
                <p className="text-gray-600 mb-6">
                  The {toolName.toLowerCase()} is not yet configured. Please
                  contact your administrator.
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-2">
              {toolName}
            </h1>
            <p className="text-lg text-gray-600">
              Category {currentCategoryIndex + 1} of {categories.length}:{" "}
              {currentCategory?.name}
            </p>
          </div>

          {/* Progress Bar */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-medium text-dgrv-blue">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-dgrv-blue">
                {currentCategory?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentQuestions.map((question, index) => (
                <div
                  key={question.questionId}
                  className="border-b pb-6 last:border-b-0"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {question.text.en}
                    </h3>
                    {question.text.zu && (
                      <p className="text-sm text-gray-600 italic">
                        {question.text.zu}
                      </p>
                    )}
                  </div>
                  {renderQuestionInput(question)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousCategory}
              disabled={currentCategoryIndex === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </Button>

              {isLastCategory ? (
                <Button
                  onClick={submitAssessment}
                  className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Assessment</span>
                </Button>
              ) : (
                <Button
                  onClick={nextCategory}
                  className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
