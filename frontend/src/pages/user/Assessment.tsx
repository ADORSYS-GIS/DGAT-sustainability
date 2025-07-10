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
import { useTranslation } from "react-i18next";

type FileData = { name: string; url: string };

export const Assessment: React.FC = () => {
  const { t } = useTranslation("assessment");
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

  const templateId = "sustainability_template";
  const toolName = t("tool_name");

  const createAssessmentMutation = useAssessmentsServicePostAssessments();
  const submitAssessmentMutation =
    useAssessmentsServicePostAssessmentsByAssessmentIdSubmit();

  // Add response mutation hooks
  const createResponseMutation =
    useResponsesServicePostAssessmentsByAssessmentIdResponses();
  const updateResponseMutation =
    useResponsesServicePutAssessmentsByAssessmentIdResponsesByResponseId();

  // Fix assessment creation mutation call
  useEffect(() => {
    if (!assessmentId) {
      createAssessmentMutation.mutate(undefined, {
        onSuccess: (data) => {
          const newId = data.assessment.assessment_id;
          navigate(`/user/assessment/${newId}`);
        },
        onError: () => toast(t("error.create")),
      });
    }
  }, [assessmentId, createAssessmentMutation, navigate, t]);

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

  // Group questions by category
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<
      string,
      { question: Question; revision: QuestionRevision }[]
    > = {};
    questionsData.questions.forEach(
      (qwr: { question: Question; revisions: QuestionRevision[] }) => {
        const category = qwr.question.category;
        const latestRevision = qwr.revisions[qwr.revisions.length - 1];
        if (!groups[category]) groups[category] = [];
        groups[category].push({
          question: qwr.question,
          revision: latestRevision,
        });
      },
    );
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
    const existingResponse = findResponseForQuestion(question_revision_id);
    if (existingResponse) {
      updateResponseMutation.mutate({
        assessmentId: assessmentId!,
        responseId: existingResponse.response_id,
        requestBody: { response: JSON.stringify(value) },
      });
    } else {
      createResponseMutation.mutate({
        assessmentId: assessmentId!,
        requestBody: {
          question_revision_id,
          response: JSON.stringify(value),
        },
      });
    }
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
    // This function is no longer needed as responses are saved immediately
  };

  const submitAssessment = async () => {
    submitAssessmentMutation.mutate({
      assessmentId: assessmentId!,
    });
    toast(t("success.submit", { tool: toolName.toLowerCase() }));
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  const nextCategory = async () => {
    // This function is no longer needed as responses are saved immediately
    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (question: QuestionRevision) => {
    const yesNoValue = answers[question.question_revision_id]?.yesNo;
    const percentageValue = answers[question.question_revision_id]?.percentage;
    const textValue = answers[question.question_revision_id]?.text || "";
    const comment = comments[question.question_revision_id] || "";
    const files: FileData[] =
      answers[question.question_revision_id]?.files || [];
    return (
      <div className="space-y-4">
        {/* Yes/No */}
        <div>
          <Label>{t("yes_no.label")}</Label>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""
              }
              onClick={() =>
                handleAnswerChange(question.question_revision_id, {
                  ...answers[question.question_revision_id],
                  yesNo: true,
                })
              }
            >
              {t("yes_no.yes")}
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""
              }
              onClick={() =>
                handleAnswerChange(question.question_revision_id, {
                  ...answers[question.question_revision_id],
                  yesNo: false,
                })
              }
            >
              {t("yes_no.no")}
            </Button>
          </div>
        </div>
        {/* Percentage */}
        <div>
          <div className="flex items-center space-x-2 relative">
            <Label>{t("percentage.label")}</Label>
            <button
              type="button"
              className="cursor-pointer text-dgrv-blue focus:outline-none"
              onClick={() => setShowPercentInfo((prev) => !prev)}
              aria-label={t("percentage.explanation_label")}
            >
              <Info className="w-4 h-4" />
            </button>
            {showPercentInfo && (
              <div className="absolute left-8 top-6 z-10 bg-white border rounded shadow-md p-3 w-56 text-xs text-gray-700">
                <div>
                  <b>{t("percentage.zero")}:</b>{" "}
                  {t("percentage.zero_description")}
                </div>
                <div>
                  <b>{t("percentage.twenty_five")}:</b>{" "}
                  {t("percentage.twenty_five_description")}
                </div>
                <div>
                  <b>{t("percentage.fifty")}:</b>{" "}
                  {t("percentage.fifty_description")}
                </div>
                <div>
                  <b>{t("percentage.seventy_five")}:</b>{" "}
                  {t("percentage.seventy_five_description")}
                </div>
                <div>
                  <b>{t("percentage.hundred")}:</b>{" "}
                  {t("percentage.hundred_description")}
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
                  handleAnswerChange(question.question_revision_id, {
                    ...answers[question.question_revision_id],
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
          <Label htmlFor={`input-text-${question.question_revision_id}`}>
            {t("response.label")}
          </Label>
          <Textarea
            id={`input-text-${question.question_revision_id}`}
            value={textValue}
            onChange={(e) =>
              handleAnswerChange(question.question_revision_id, {
                ...answers[question.question_revision_id],
                text: e.target.value,
              })
            }
            placeholder={t("response.placeholder")}
            className="mt-1"
            rows={4}
          />
          {/* File Upload */}
          <div className="mt-2 flex items-center space-x-2">
            <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>{t("file.add_file")}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(
                    question.question_revision_id,
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
          <p className="text-gray-600">{t("loading")}</p>
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
                  {t("not_available.title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("not_available.description", {
                    tool: toolName.toLowerCase(),
                  })}
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t("not_available.back")}
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
              {t("category", {
                current: currentCategoryIndex + 1,
                total: categories.length,
                name: currentCategory,
              })}
            </p>
          </div>

          {/* Progress Bar */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {t("progress")}
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
              {currentQuestions.map((question, index) => (
                <div
                  key={question.revision.question_revision_id}
                  className="border-b pb-6 last:border-b-0"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {index + 1}. {question.revision.text}
                    </h3>
                  </div>
                  {renderQuestionInput(question.revision)}
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
              <span>{t("nav.previous")}</span>
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{t("nav.save_draft")}</span>
              </Button>

              {isLastCategory ? (
                <Button
                  onClick={submitAssessment}
                  className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{t("nav.submit")}</span>
                </Button>
              ) : (
                <Button
                  onClick={nextCategory}
                  className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>{t("nav.next")}</span>
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
