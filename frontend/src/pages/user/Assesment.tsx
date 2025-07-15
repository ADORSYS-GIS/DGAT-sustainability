import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  useAssessmentsServicePostAssessments,
  useAssessmentsServiceGetAssessmentsByAssessmentId,
  useResponsesServicePostAssessmentsByAssessmentIdResponses,
  useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId,
  useFilesServicePostAssessmentsByAssessmentIdResponsesByResponseIdFiles,
  useAssessmentsServicePostAssessmentsByAssessmentIdSubmit,
  useQuestionsServiceGetQuestions,
} from "../../openapi-rq/queries/queries";
import {
  AssessmentDetailResponse,
  CreateResponseRequest,
  UpdateResponseRequest,
  response_id_files_body,
  Question,
  QuestionRevision,
} from "../../openapi-rq/requests/types.gen";
import { toast } from "sonner";
import {
  Info,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
} from "lucide-react";

type FileData = { name: string; url: string };

export const Assessment: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        yesNo?: boolean;
        percentage?: number;
        text?: string;
        files?: FileData[];
      }
    >
  >({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showPercentInfo, setShowPercentInfo] = useState(false);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);

  const templateId = "sustainability_template";
  const toolName = "Sustainability Assessment";

  const createAssessmentMutation = useAssessmentsServicePostAssessments();
  const submitAssessmentMutation =
    useAssessmentsServicePostAssessmentsByAssessmentIdSubmit();

  // Add response mutation hooks
  const createResponseMutation =
    useResponsesServicePostAssessmentsByAssessmentIdResponses();
  const updateResponseMutation =
    useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId();

  // Only call create assessment once if no assessmentId
  useEffect(() => {
    if (!assessmentId && !hasCreatedAssessment && !createAssessmentMutation.isPending) {
      setHasCreatedAssessment(true);
      createAssessmentMutation.mutate(
        { requestBody: { language: "en" } },
        {
          onSuccess: (data) => {
            const newId = data.assessment.assessment_id;
            navigate(`/user/assessment/${newId}`);
          },
          onError: () => {
            toast("Failed to create assessment");
            setHasCreatedAssessment(false);
          },
        }
      );
    }
  }, [assessmentId, hasCreatedAssessment, createAssessmentMutation, navigate]);

  // Fetch assessment detail if assessmentId exists
  const { data: assessmentDetail, isLoading: assessmentLoading } =
    useAssessmentsServiceGetAssessmentsByAssessmentId(
      assessmentId ? { assessmentId } : { assessmentId: "" },
      undefined,
      { enabled: !!assessmentId },
    );

  // Fetch questions with categories and revisions
  const { data: questionsData, isLoading: questionsLoading } =
    useQuestionsServiceGetQuestions();

  // Group questions by category (support both old and new formats)
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};
    type QuestionNewFormat = { question_id: string; category: string; created_at: string; latest_revision: QuestionRevision };
    type QuestionOldFormat = { question: Question; revisions: QuestionRevision[] };
    type QuestionUnion = QuestionNewFormat | QuestionOldFormat;
    (questionsData.questions as QuestionUnion[]).forEach((q) => {
      let category: string | undefined;
      let question: Question | undefined;
      let revision: QuestionRevision | undefined;
      if ('category' in q && 'latest_revision' in q) {
        // New format
        category = q.category;
        question = {
          question_id: q.question_id,
          category: q.category,
          created_at: q.created_at,
        };
        revision = q.latest_revision;
      } else if ('question' in q && 'revisions' in q) {
        // Old format
        category = q.question.category;
        question = q.question;
        revision = q.revisions[q.revisions.length - 1];
      }
      if (category && question && revision) {
        if (!groups[category]) groups[category] = [];
        groups[category].push({ question, revision });
      }
    });
    return groups;
  }, [questionsData]);

  const categories = Object.keys(groupedQuestions);
  const getCurrentCategoryQuestions = () =>
    groupedQuestions[categories[currentCategoryIndex]] || [];

  // Helper to find response for a question
  const findResponseForQuestion = (question_revision_id: string) => {
    return assessmentDetail?.responses?.find(
      (r) => r.question_revision_id === question_revision_id,
    );
  };

  // Type guard for QuestionRevision
  function hasQuestionRevisionId(obj: QuestionRevision): obj is QuestionRevision & { question_revision_id: string } {
    return 'question_revision_id' in obj && typeof (obj as { question_revision_id?: unknown }).question_revision_id === 'string';
  }

  // Helper to get the question revision id key
  const getRevisionKey = (revision: QuestionRevision): string => {
    if (hasQuestionRevisionId(revision)) {
      return revision.question_revision_id;
    } else if ('latest_revision' in revision && typeof (revision as { latest_revision?: unknown }).latest_revision === 'string') {
      return (revision as { latest_revision: string }).latest_revision;
    }
    return '';
  };

  const handleAnswerChange = (
    question_revision_id: string,
    value: {
      yesNo?: boolean;
      percentage?: number;
      text?: string;
      files?: FileData[];
    },
  ) => {
    setAnswers((prev) => ({ ...prev, [question_revision_id]: value }));
    // No backend call here!
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

  // --- Navigation handler: on Next, send all answers for current category to backend ---
  const nextCategory = async () => {
    const currentQuestions = getCurrentCategoryQuestions();
    const responsesToSend = currentQuestions.map((question) => {
      const key = getRevisionKey(question.revision);
      const answer = answers[key];
      return answer
        ? {
            question_revision_id: key,
            response: JSON.stringify(answer),
          }
        : null;
    }).filter(Boolean);

    if (responsesToSend.length > 0) {
      createResponseMutation.mutate({
        assessmentId: assessmentId!,
        requestBody: responsesToSend,
      });
    }
    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  // --- Final submit: send all answers for current category, then submit assessment ---
  const submitAssessment = async () => {
    const currentQuestions = getCurrentCategoryQuestions();
    const responsesToSend = currentQuestions.map((question) => {
      const key = getRevisionKey(question.revision);
      const answer = answers[key];
      return answer
        ? {
            question_revision_id: key,
            response: JSON.stringify(answer),
          }
        : null;
    }).filter(Boolean);

    if (responsesToSend.length > 0) {
      await new Promise((resolve) => {
        createResponseMutation.mutate(
          {
            assessmentId: assessmentId!,
            requestBody: responsesToSend,
          },
          {
            onSuccess: resolve,
            onError: resolve,
          }
        );
      });
    }
    submitAssessmentMutation.mutate({
      assessmentId: assessmentId!,
    });
    toast(`Your ${toolName.toLowerCase()} has been submitted successfully`);
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  // Remove or disable saveDraft
  const saveDraft = async () => {};

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (question: QuestionRevision) => {
    const key = getRevisionKey(question);
    const yesNoValue = answers[key]?.yesNo;
    const percentageValue = answers[key]?.percentage;
    const textValue = answers[key]?.text || "";
    const comment = comments[key] || "";
    const files: FileData[] = answers[key]?.files || [];
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
                handleAnswerChange(key, {
                  ...answers[key],
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
                handleAnswerChange(key, {
                  ...answers[key],
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
                <div>
                  <b>0%:</b> Not started
                </div>
                <div>
                  <b>25%:</b> Some progress
                </div>
                <div>
                  <b>50%:</b> Halfway
                </div>
                <div>
                  <b>75%:</b> Almost done
                </div>
                <div>
                  <b>100%:</b> Fully achieved
                </div>
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
                  handleAnswerChange(key, {
                    ...answers[key],
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
          <Label htmlFor={`input-text-${key}`}>
            Your Response
          </Label>
          <Textarea
            id={`input-text-${key}`}
            value={textValue}
            onChange={(e) =>
              handleAnswerChange(key, {
                ...answers[key],
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
                onChange={(e) =>
                  handleFileUpload(
                    key,
                    e.target.files,
                  )
                }
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

  if (assessmentLoading || !assessmentDetail) {
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
              {currentCategory}
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
                {currentCategory}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {currentQuestions.map((question, index) => {
                let questionText = '';
                if (typeof question.revision.text === 'object' && question.revision.text !== null) {
                  const textObj = question.revision.text as Record<string, unknown>;
                  questionText = typeof textObj['en'] === 'string'
                    ? textObj['en'] as string
                    : Object.values(textObj).find((v) => typeof v === 'string') as string || '';
                } else if (typeof question.revision.text === 'string') {
                  questionText = question.revision.text;
                }
                return (
                  <div
                    key={getRevisionKey(question.revision)}
                    className="border-b pb-6 last:border-b-0"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {index + 1}. {questionText}
                      </h3>
                    </div>
                    {renderQuestionInput(question.revision)}
                  </div>
                );
              })}
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