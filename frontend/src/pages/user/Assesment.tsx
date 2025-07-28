import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useOfflineQuestions, useOfflineAssessment, useOfflineAssessmentMutation, useOfflineBatchResponseMutation } from "../../hooks/useOfflineLocal";
import { toast } from "sonner";
import { Info, Paperclip, ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import type { Question, QuestionRevision, Assessment as AssessmentType, Response as ResponseType } from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "../../services/indexeddb";
import type { CreateResponseRequest } from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";

type FileData = { name: string; url: string };

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

export const Assessment: React.FC = () => {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const orgInfo = React.useMemo(() => {
    if (!user || !user.organizations) return { orgId: "", categories: [] };
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) return { orgId: "", categories: [] };
    const orgObj = user.organizations[orgKeys[0]] || {};
    return {
      orgId: orgObj.id || "",
      categories: user.categories || orgObj.categories || [],
    };
  }, [user]);
  
  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showPercentInfo, setShowPercentInfo] = useState(false);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);
  const toolName = t("sustainability") + " " + t("assessment");

  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const { data: assessmentDetail, isLoading: assessmentLoading } = useOfflineAssessment({ assessmentId: assessmentId || "" });

  const createAssessmentMutation = useOfflineAssessmentMutation();
  const createResponseMutation = useOfflineBatchResponseMutation();
  const submitAssessmentMutation = useOfflineAssessmentMutation();

  useEffect(() => {
    // Robust role check: only an org_admin should be able to create an assessment
    const allRoles = [
      ...(user?.roles || []),
      ...(user?.realm_access?.roles || []),
    ].map((r) => r.toLowerCase());
    const canCreate = allRoles.includes("org_admin");

    // If user tries to access assessment creation route without permission, redirect them
    if (!assessmentId && !canCreate && user?.sub) {
      toast.error(t('assessment.noPermissionToCreate', { defaultValue: 'Only organization administrators can create assessments.' }));
      navigate("/dashboard");
      return;
    }

    if (
      !assessmentId &&
      !hasCreatedAssessment &&
      !createAssessmentMutation.isPending &&
      user?.sub &&
      canCreate
    ) {
      setHasCreatedAssessment(true);
      const newAssessmentId = uuidv4();
      const newAssessment: AssessmentType = {
        assessment_id: newAssessmentId,
        user_id: user.sub,
        language: "en",
        created_at: new Date().toISOString(),
      };
      createAssessmentMutation.mutate(newAssessment, {
        onSuccess: () => navigate(`/user/assessment/${newAssessmentId}`),
        onError: (err) => {
          toast.error(t('assessment.failedToCreate'));
          console.error(err);
          setHasCreatedAssessment(false);
        },
      });
    }
  }, [assessmentId, hasCreatedAssessment, user, createAssessmentMutation, navigate, t]);
  
    // --- Final submit: send all answers for current category, then submit assessment ---
  const submitAssessment = async () => {
    if (!isCurrentCategoryComplete()) {
      toast.error(t('assessment.completeAllQuestions'));
      return;
    }
    const currentQuestions = getCurrentCategoryQuestions();
    const responsesToSend = currentQuestions
      .map((question) => {
        const key = getRevisionKey(question.revision);
        const answer = answers[key];
        if (!answer) return null;
        return createResponseToSave(key, answer);
      })
      .filter((r): r is CreateResponseRequest => r !== null);

    // Save all responses as a batch
    if (assessmentId && responsesToSend.length > 0) {
      createResponseMutation.mutate({ assessmentId, responses: responsesToSend });
    }
    
    // Mark assessment as submitted (locally)
    if (assessmentDetail) {
        const updatedAssessment = { ...assessmentDetail, status: 'submitted' };
        submitAssessmentMutation.mutate(updatedAssessment, {
            onSuccess: () => {
                // Also add a specific "submit" action to the sync queue
                offlineDB.addToSyncQueue({
                    type: "submit_assessment",
                    data: { assessment_id: assessmentDetail.assessment_id }
                });
                toast.success(t('assessment.submittedLocally'));
                navigate("/dashboard");
            }
        });
    }
  };

  // Group questions by category (support both old and new formats)
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};
    (questionsData.questions as unknown[]).forEach((q) => {
      let category: string | undefined;
      let question: Question | undefined;
      let revision: QuestionRevision | undefined;
      if (typeof q === 'object' && q !== null && 'latest_revision' in q && 'category' in q) {
        // New format
        category = (q as { category: string }).category;
        question = q as unknown as Question;
        revision = (q as { latest_revision: unknown }).latest_revision as unknown as QuestionRevision;
      } else if (typeof q === 'object' && q !== null && 'question' in q && 'revisions' in q) {
        // Old format
        category = (q as { question: { category: string } }).question.category;
        question = (q as { question: unknown }).question as unknown as Question;
        const revisions = (q as { revisions: unknown[] }).revisions as unknown as QuestionRevision[];
        revision = revisions[revisions.length - 1];
      }
      if (category && question && revision) {
        if (!groups[category]) groups[category] = [];
        groups[category].push({ question, revision });
      }
    });
    // Filter to only categories assigned to the user (Org_User)
    const filtered: typeof groups = {};
    for (const cat of orgInfo.categories) {
      if (groups[cat]) filtered[cat] = groups[cat];
    }
    return filtered;
  }, [questionsData, orgInfo.categories]);

  const categories = Object.keys(groupedQuestions);
  const getCurrentCategoryQuestions = () =>
    groupedQuestions[categories[currentCategoryIndex]] || [];

  // Helper to find response for a question
  const findResponseForQuestion = (question_revision_id: string) => {
    // This function now needs to get responses from the `answers` state,
    // as `assessmentDetail` does not contain them.
    // This is a placeholder for the correct logic.
    return null;
  };

  // Type guard for QuestionRevision
  function hasQuestionRevisionId(
    obj: QuestionRevision | object,
  ): obj is QuestionRevision & { question_revision_id: string } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'question_revision_id' in obj &&
      typeof (obj as { question_revision_id?: unknown }).question_revision_id === 'string'
    );
  }

  // Helper to get the question revision id key
  const getRevisionKey = (revision: QuestionRevision): string => {
    if (hasQuestionRevisionId(revision)) {
      return revision.question_revision_id;
    } else if (
      "latest_revision" in revision &&
      typeof (revision as { latest_revision?: unknown }).latest_revision ===
        "string"
    ) {
      return (revision as { latest_revision: string }).latest_revision;
    }
    return "";
  };

  const handleAnswerChange = (question_revision_id: string, value: Partial<LocalAnswer>) => {
    setAnswers((prev) => ({ ...prev, [question_revision_id]: { ...prev[question_revision_id], ...value } as LocalAnswer }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [questionId]: comment }));
  };

  // When creating a response to save:
  const createResponseToSave = (key: string, answer: LocalAnswer): CreateResponseRequest => {
    return {
      question_revision_id: key,
      response: JSON.stringify(answer), // Stringify the whole local answer object
      version: 1,
    };
  };

  // --- Validation helpers ---
  const isAnswerComplete = (answer: {
    yesNo?: boolean;
    percentage?: number;
    text?: string;
    files?: FileData[];
  }) => {
    return (
      typeof answer?.yesNo === "boolean" &&
      typeof answer?.percentage === "number" &&
      typeof answer?.text === "string" &&
      answer.text.trim() !== ""
    );
  };
  const isCurrentCategoryComplete = () => {
    const currentQuestions = getCurrentCategoryQuestions();
    return currentQuestions.every((q) => {
      const key = getRevisionKey(q.revision);
      return isAnswerComplete(answers[key]);
    });
  };

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 1024 * 1024) {
      toast.error(t('assessment.fileTooLarge'));
      return;
    }
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
    if (!isCurrentCategoryComplete()) {
      toast.error(
        t('assessment.completeAllQuestionsNext'),
      );
      return;
    }
    const currentQuestions = getCurrentCategoryQuestions();
    const responsesToSend = currentQuestions
      .map((question) => {
        const key = getRevisionKey(question.revision);
        const answer = answers[key];
        if (!answer) return null;

        return {
          question_revision_id: key,
          response: JSON.stringify(answer),
          version: 1,
        } as CreateResponseRequest; // Use CreateResponseRequest type
      })
      .filter((r): r is CreateResponseRequest => r !== null);

    // Save all responses as a batch
    if (assessmentId && responsesToSend.length > 0) {
      createResponseMutation.mutate({ assessmentId, responses: responsesToSend });
    }

    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  // Remove or disable saveDraft
  const saveDraft = async () => {};

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (revision: QuestionRevision) => {
    const key = getRevisionKey(revision);
    const yesNoValue = answers[key]?.yesNo;
    const percentageValue = answers[key]?.percentage;
    const textValue = answers[key]?.text || "";
    const comment = comments[key] || "";
    const files: FileData[] = answers[key]?.files || [];
    return (
      <div className="space-y-4">
        {/* Yes/No */}
        <div>
          <Label>
            {t('assessment.yesNo')} <span className="text-red-500">*</span>
          </Label>
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
            <Label>
              {t('assessment.percentage')} <span className="text-red-500">*</span>
            </Label>
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
                  <b>0%:</b> {t('assessment.percentNotStarted')}
                </div>
                <div>
                  <b>25%:</b> {t('assessment.percentSomeProgress')}
                </div>
                <div>
                  <b>50%:</b> {t('assessment.percentHalfway')}
                </div>
                <div>
                  <b>75%:</b> {t('assessment.percentAlmostDone')}
                </div>
                <div>
                  <b>100%:</b> {t('assessment.percentFullyAchieved')}
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
            {t('assessment.yourResponse')} <span className="text-red-500">*</span>
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
            placeholder={t('assessment.enterYourResponse')}
            className="mt-1"
            rows={4}
          />
          {/* File Upload */}
          <div className="mt-2 flex items-center space-x-2">
            <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>{t('assessment.addFile')}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(key, e.target.files)}
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
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-dgrv-blue mb-4">
                  {t("assessment")} {t("notAvailable", { defaultValue: "Not Available" })}
                </h2>
                <p className="text-gray-600 mb-6">
                  {toolName.toLowerCase()} {t("notConfigured", { defaultValue: "is not yet configured. Please contact your administrator." })}
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t("home")}
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
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-2">
              {toolName}
            </h1>
            <p className="text-lg text-gray-600">
              {t("category")} {currentCategoryIndex + 1} {t("of", { defaultValue: "of" })} {categories.length}: {currentCategory}
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
              {currentQuestions.map((question, index) => {
                let questionText = "";
                if (
                  typeof question.revision.text === "object" &&
                  question.revision.text !== null
                ) {
                  const textObj = question.revision.text as Record<
                    string,
                    unknown
                  >;
                  questionText =
                    typeof textObj["en"] === "string"
                      ? (textObj["en"] as string)
                      : (Object.values(textObj).find(
                          (v) => typeof v === "string",
                        ) as string) || "";
                } else if (typeof question.revision.text === "string") {
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
              <span>{t("previous")}</span>
            </Button>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{t("saveDraft")}</span>
              </Button>

              {isLastCategory ? (
                <Button
                  onClick={submitAssessment}
                  className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                  disabled={!isCurrentCategoryComplete()}
                >
                  <Send className="w-4 h-4" />
                  <span>{t("submit")}</span>
                </Button>
              ) : (
                <Button
                  onClick={nextCategory}
                  className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                  disabled={!isCurrentCategoryComplete()}
                >
                  <span>{t("next")}</span>
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
