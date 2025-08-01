import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Navbar } from "@/components/shared/Navbar";
import { AssessmentSuccessModal } from "@/components/shared/AssessmentSuccessModal";
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { AssessmentList } from "@/components/shared/AssessmentList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  useOfflineQuestions,
  useOfflineAssessment,
  useOfflineAssessmentsMutation,
  useOfflineResponsesMutation,
  useOfflineSyncStatus,
  useOfflineDraftAssessments,
} from "../../hooks/useOfflineApi";
import { toast } from "sonner";
import { Info, Paperclip, ChevronLeft, ChevronRight, Send, FileText } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import type {
  Question,
  QuestionRevision,
  Assessment as AssessmentType,
  AssessmentDetailResponse,
} from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "../../services/indexeddb";
import type { CreateResponseRequest, CreateAssessmentRequest } from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import type { OfflineSubmission } from "@/types/offline";

type FileData = { name: string; url: string };

type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

// Type guard for AssessmentDetailResponse
function isAssessmentDetailResponse(
  data: AssessmentType | AssessmentDetailResponse | undefined
): data is AssessmentDetailResponse {
  return !!data && "assessment" in data && !!data.assessment;
}

// Type guard for assessment result
function isAssessmentResult(result: unknown): result is { assessment: AssessmentType } {
  return !!result && typeof result === 'object' && result !== null && 'assessment' in result;
}

// Type guard for QuestionRevision
function hasQuestionRevisionId(revision: QuestionRevision): revision is QuestionRevision & { question_revision_id: string } {
  return "question_revision_id" in revision && typeof revision.question_revision_id === "string";
}

export const Assessment: React.FC = () => {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";
  const { isOnline } = useOfflineSyncStatus();

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [showPercentInfo, setShowPercentInfo] = useState(false);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);
  const [creationAttempts, setCreationAttempts] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<OfflineSubmission[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const toolName = t("sustainability") + " " + t("assessment");

  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const { data: assessmentDetail, isLoading: assessmentLoading } = useOfflineAssessment(assessmentId || "");
  const { data: assessmentsData, isLoading: assessmentsLoading, refetch: refetchAssessments } = useOfflineDraftAssessments();
  const { createAssessment, submitAssessment: submitAssessmentHook, isPending: assessmentMutationPending } = useOfflineAssessmentsMutation();
  const { createResponses, isPending: responseMutationPending } = useOfflineResponsesMutation();

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmissions = async () => {
      try {
        const submissions = await offlineDB.getAllSubmissions();
        setPendingSubmissions(submissions.filter((sub) => sub.sync_status === "pending"));
      } catch (error) {
        console.error("Failed to check pending submissions:", error);
      }
    };
    checkPendingSubmissions();
  }, [isOnline]);

  const orgInfo = React.useMemo(() => {
    if (!user) return { orgId: "", categories: [] };
    let orgId = "";
    if (user.organizations && typeof user.organizations === "object") {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgKeys[0]];
        orgId = orgData?.id || "";
      }
    }
    const userCategories = user.categories || [];
    return { orgId, categories: userCategories };
  }, [user]);

  // Assessment creation logic
  useEffect(() => {
    if (!user) return;
    const allRoles = [...(user.roles || []), ...(user.realm_access?.roles || [])].map((r) => r.toLowerCase());
    const canCreate = allRoles.includes("org_admin");

    if (!assessmentId && !canCreate) {
      toast.error(t("assessment.noPermissionToCreate", { defaultValue: "Only organization administrators can create assessments." }));
      navigate("/dashboard");
      return;
    }
  }, [assessmentId, user, navigate, t]);

  // Handle assessment selection
  const handleSelectAssessment = (selectedAssessmentId: string) => {
    navigate(`/assessment/${selectedAssessmentId}`);
  };

  // Handle assessment creation from modal
  const handleCreateAssessment = async (assessmentName: string) => {
    if (creationAttempts >= 3) {
      toast.error(t("assessment.maxRetriesExceeded", { defaultValue: "Failed to create assessment after multiple attempts. Please try again later." }));
      setShowCreateModal(false);
      navigate("/dashboard");
      return;
    }

    setIsCreatingAssessment(true);
    setHasCreatedAssessment(true);
    setCreationAttempts((prev) => prev + 1);
    
    const newAssessment: CreateAssessmentRequest = { 
      language: currentLanguage,
      name: assessmentName,
    };
    
    createAssessment(newAssessment, {
      onSuccess: (result) => {
        if (result && isAssessmentResult(result) && result.assessment?.assessment_id) {
          const realAssessmentId = result.assessment.assessment_id;
          if (!realAssessmentId.startsWith("temp_")) {
            setShowSuccessModal(true);
            // Refresh the assessments list
            refetchAssessments();
            const waitForAssessment = async () => {
              let attempts = 0;
              const maxAttempts = 10;
              while (attempts < maxAttempts) {
                const savedAssessment = await offlineDB.getAssessment(realAssessmentId);
                if (savedAssessment) return;
                await new Promise((resolve) => setTimeout(resolve, 500));
                attempts++;
              }
            };
            waitForAssessment();
          } else {
            setHasCreatedAssessment(false);
          }
        } else {
          toast.error(t("assessment.failedToCreate"));
          setHasCreatedAssessment(false);
        }
        setShowCreateModal(false);
        setIsCreatingAssessment(false);
      },
      onError: () => {
        toast.error(t("assessment.failedToCreate"));
        setHasCreatedAssessment(false);
        setShowCreateModal(false);
        setIsCreatingAssessment(false);
      },
      organizationId: orgInfo.orgId,
      userEmail: user.email,
    });
  };

  // Timeout for assessment creation
  useEffect(() => {
    if (hasCreatedAssessment && !assessmentId) {
      const timeout = setTimeout(() => {
        toast.error(t("assessment.creationTimeout", { defaultValue: "Assessment creation timed out. Please try again." }));
        setHasCreatedAssessment(false);
        navigate("/dashboard");
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [hasCreatedAssessment, assessmentId, navigate, t]);

  // Submit assessment
  const submitAssessment = async () => {
    if (!assessmentDetail) {
      toast.error(t("assessment.failedToSubmit", { defaultValue: "Assessment details not loaded. Please try again." }));
      return;
    }

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    if (!actualAssessment.assessment_id) {
      toast.error(t("assessment.failedToSubmit", { defaultValue: "Assessment ID is missing. Please try again." }));
      return;
    }

    try {
      const allResponsesToSave: CreateResponseRequest[] = [];
      for (const categoryName of categories) {
        const categoryQuestions = groupedQuestions[categoryName] || [];
        for (const { revision } of categoryQuestions) {
          const key = getRevisionKey(revision);
          if (!key) continue;
          const answer = answers[key];
          if (answer && isAnswerComplete(answer)) {
            allResponsesToSave.push(createResponseToSave(key, answer));
          }
        }
      }

      if (allResponsesToSave.length > 0) {
        await createResponses(actualAssessment.assessment_id, allResponsesToSave, {
          onSuccess: async () => {
            // Removed responses saved success toast
            // Removed responses queued for sync info toast
            const savedResponses = await offlineDB.getResponsesByAssessment(actualAssessment.assessment_id);
            if (savedResponses.length !== allResponsesToSave.length) {
              // Removed partial save warning toast
            }
          },
          onError: () => {
            toast.error(t("assessment.failedToSaveResponses", { defaultValue: "Failed to save responses. Please try again." }));
          },
        });

        await submitAssessmentHook(actualAssessment.assessment_id, {
          onSuccess: () => {
            toast.success(
              isOnline
                ? t("assessment.submittedSuccessfully", { defaultValue: "Assessment submitted successfully!" })
                : t("assessment.queuedForSync", { defaultValue: "Assessment saved offline and will be submitted when online." })
            );
            navigate("/dashboard");
          },
          onError: () => {
            if (!isOnline) {
              // Removed offline saved success toast
              navigate("/dashboard");
            } else {
              toast.error(t("assessment.failedToSubmit", { defaultValue: "Failed to submit assessment." }));
            }
          },
        });
      } else {
        toast.error(t("assessment.noResponsesToSubmit", { defaultValue: "No responses to submit for the current category." }));
      }
    } catch (error) {
      if (!navigator.onLine) {
        // Removed offline saved success toast
        navigate("/dashboard");
      } else {
        toast.error(t("assessment.failedToSubmit", { defaultValue: "Failed to submit assessment." }));
      }
    }
  };

  // Group questions by category
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};
    questionsData.questions.forEach((question) => {
      const category = question.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push({ question, revision: question.latest_revision });
    });

    const filtered: typeof groups = {};
    for (const userCat of orgInfo.categories) {
      const normalizedUserCat = userCat.toLowerCase();
      const matchingCategory = Object.keys(groups).find((cat) => cat.toLowerCase() === normalizedUserCat);
      if (matchingCategory && groups[matchingCategory]) {
        filtered[matchingCategory] = groups[matchingCategory];
      }
    }
    return filtered;
  }, [questionsData?.questions, orgInfo.categories]);

  const categories = Object.keys(groupedQuestions);

  // Check if we have any categories - only show this message for Org_User, not org_admin
  const allRoles = [...(user?.roles || []), ...(user?.realm_access?.roles || [])].map((r) => r.toLowerCase());
  const isOrgUser = allRoles.includes("org_user") && !allRoles.includes("org_admin");
  
  if (categories.length === 0 && isOrgUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("assessment.noCategoriesTitle", { defaultValue: "No Categories Available" })}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("assessment.noCategoriesDescription", {
              defaultValue: "No assessment categories have been assigned to your account. Please contact your organization administrator.",
            })}
          </p>
          <Button onClick={() => navigate("/dashboard")}>{t("assessment.backToDashboard", { defaultValue: "Back to Dashboard" })}</Button>
        </div>
      </div>
    );
  }

  // Show assessment list if no specific assessment is selected
  if (!assessmentId) {
    const allRoles = [...(user?.roles || []), ...(user?.realm_access?.roles || [])].map((r) => r.toLowerCase());
    const canCreate = allRoles.includes("org_admin");

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
                {t('assessment.selectAssessment', { defaultValue: 'Select Assessment' })}
              </h1>
              <p className="text-lg text-gray-600">
                {t('assessment.selectAssessmentDescription', { defaultValue: 'Choose an assessment to continue or create a new one.' })}
              </p>
            </div>

            {canCreate && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t('assessment.createNewAssessment', { defaultValue: 'Create New Assessment' })}
                </Button>
              </div>
            )}

            <AssessmentList
              assessments={assessmentsData?.assessments || []}
              onSelectAssessment={handleSelectAssessment}
              isLoading={assessmentsLoading}
            />

            {/* Create Assessment Modal */}
            <CreateAssessmentModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreateAssessment}
              isLoading={isCreatingAssessment}
            />
          </div>
        </div>
      </div>
    );
  }

  const getCurrentCategoryQuestions = () => groupedQuestions[categories[currentCategoryIndex]] || [];
  const getRevisionKey = (revision: QuestionRevision): string => {
    return hasQuestionRevisionId(revision) ? revision.question_revision_id : "";
  };

  const handleAnswerChange = (question_revision_id: string, value: Partial<LocalAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [question_revision_id]: { ...prev[question_revision_id], ...value } as LocalAnswer,
    }));
  };

  const createResponseToSave = (key: string, answer: LocalAnswer): CreateResponseRequest => ({
    question_revision_id: key,
    response: JSON.stringify(answer),
    version: 1,
  });

  const isAnswerComplete = (answer: LocalAnswer) =>
    typeof answer?.yesNo === "boolean" && typeof answer?.percentage === "number" && typeof answer?.text === "string" && answer.text.trim() !== "";

  const isCurrentCategoryComplete = () =>
    getCurrentCategoryQuestions().every((q) => {
      const key = getRevisionKey(q.revision);
      return isAnswerComplete(answers[key]);
    });

  const handleFileUpload = (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 1024 * 1024) {
      toast.error(t("assessment.fileTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = { name: file.name, url: e.target?.result as string };
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], files: [...(prev[questionId]?.files || []), fileData] },
      }));
    };
    reader.readAsDataURL(file);
  };

  const nextCategory = async () => {
    if (!isCurrentCategoryComplete()) {
      toast.error(t("assessment.completeAllQuestionsNext"));
      return;
    }
    const currentQuestions = getCurrentCategoryQuestions();
    const responsesToSend = currentQuestions
      .map((question) => {
        const key = getRevisionKey(question.revision);
        if (!key) return null;
        const answer = answers[key];
        if (!answer) return null;
        return createResponseToSave(key, answer);
      })
      .filter((r): r is CreateResponseRequest => r !== null);

    if (assessmentId && responsesToSend.length > 0) {
      try {
        await createResponses(assessmentId, responsesToSend, {
          onSuccess: async () => {
            // Removed responses saved success toast
            // Removed responses queued for sync info toast
            const savedResponses = await offlineDB.getResponsesByAssessment(assessmentId);
            if (savedResponses.length !== responsesToSend.length) {
              // Removed partial save warning toast
            }
          },
          onError: () => {
            toast.error(t("assessment.failedToSaveResponses", { defaultValue: "Failed to save responses. Please try again." }));
          },
        });
      } catch (error) {
        toast.error(t("assessment.failedToSaveResponses", { defaultValue: "Failed to save responses. Please try again." }));
      }
    }

    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

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
    const files: FileData[] = answers[key]?.files || [];

    return (
      <div className="space-y-4">
        <div>
          <Label>
            {t("assessment.yesNo")} <span className="text-red-500">*</span>
          </Label>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={yesNoValue === true ? "bg-dgrv-green hover:bg-green-700" : ""}
              onClick={() => handleAnswerChange(key, { yesNo: true })}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""}
              onClick={() => handleAnswerChange(key, { yesNo: false })}
            >
              No
            </Button>
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2 relative">
            <Label>
              {t("assessment.percentage")} <span className="text-red-500">*</span>
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
                  <b>0%:</b> {t("assessment.percentNotStarted")}
                </div>
                <div>
                  <b>25%:</b> {t("assessment.percentSomeProgress")}
                </div>
                <div>
                  <b>50%:</b> {t("assessment.percentHalfway")}
                </div>
                <div>
                  <b>75%:</b> {t("assessment.percentAlmostDone")}
                </div>
                <div>
                  <b>100%:</b> {t("assessment.percentFullyAchieved")}
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
                onClick={() => handleAnswerChange(key, { percentage: val })}
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor={`input-text-${key}`}>
            {t("assessment.yourResponse")} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id={`input-text-${key}`}
            value={textValue}
            onChange={(e) => handleAnswerChange(key, { text: e.target.value })}
            placeholder={t("assessment.enterYourResponse")}
            className="mt-1"
            rows={4}
          />
          <div className="mt-2 flex items-center space-x-2">
            <label className="flex items-center cursor-pointer text-dgrv-blue hover:underline">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>{t("assessment.addFile")}</span>
              <input type="file" className="hidden" onChange={(e) => handleFileUpload(key, e.target.files)} />
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

  if (assessmentId && assessmentId.startsWith("temp_")) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
            <p className="text-gray-600">{t("assessment.creating", { defaultValue: "Creating assessment..." })}</p>
            <p className="text-sm text-gray-500 mt-2">{t("assessment.pleaseWait", { defaultValue: "Please wait while we set up your assessment." })}</p>
            {creationAttempts > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {t("assessment.attempt", { defaultValue: "Attempt" })} {creationAttempts}/3
              </p>
            )}
          </div>
        </div>
        <AssessmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onReturnToDashboard={() => {
            setShowSuccessModal(false);
            navigate("/dashboard");
          }}
        />
      </>
    );
  }

  if (assessmentLoading || !assessmentDetail) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
          </div>
        </div>
        <AssessmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onReturnToDashboard={() => {
            setShowSuccessModal(false);
            navigate("/dashboard");
          }}
        />
      </>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-dgrv-blue mb-2">{toolName}</h1>
          <p className="text-lg text-gray-600">
            {t("category")} {currentCategoryIndex + 1} {t("of", { defaultValue: "of" })} {categories.length}: {currentCategory}
          </p>
        </div>

        {!isOnline && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800">
                    {t("assessment.offlineMode", { defaultValue: "You are offline. Your responses will be saved locally and synced when you come back online." })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      window.dispatchEvent(new Event("online"));
                      // Removed sync triggered success toast
                    } catch (error) {
                      // Removed sync failed error toast
                    }
                  }}
                  className="text-xs"
                >
                  Sync Now
                </Button>
              </div>
              {pendingSubmissions.length > 0 && (
                <div className="mt-2 text-xs text-orange-700">
                  {t("assessment.pendingSubmissions", { defaultValue: "Pending submissions:" })} {pendingSubmissions.length}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isOnline && pendingSubmissions.length > 0 && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">
                    {t("assessment.onlineWithPending", { defaultValue: "You are online. Syncing pending submissions..." })}
                  </span>
                </div>
                <div className="text-xs text-green-700">
                  {t("assessment.pendingSubmissions", { defaultValue: "Pending submissions:" })} {pendingSubmissions.length}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t("progress")}</span>
              <span className="text-sm font-medium text-dgrv-blue">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-dgrv-blue">{currentCategory}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestions.map((question, index) => {
              let questionText = "";
              if (typeof question.revision.text === "object" && question.revision.text !== null) {
                const textObj = question.revision.text as Record<string, unknown>;
                questionText = typeof textObj[currentLanguage] === "string" ? textObj[currentLanguage] : (Object.values(textObj).find((v) => typeof v === "string") as string) || "";
              } else if (typeof question.revision.text === "string") {
                questionText = question.revision.text;
              }
              return (
                <div key={getRevisionKey(question.revision)} className="border-b pb-6 last:border-b-0">
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

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={previousCategory} disabled={currentCategoryIndex === 0} className="flex items-center space-x-2">
            <ChevronLeft className="w-4 h-4" />
            <span>{t("previous")}</span>
          </Button>
          <div className="flex space-x-4">
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
      <AssessmentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onReturnToDashboard={() => {
          setShowSuccessModal(false);
          navigate("/dashboard");
        }}
      />

      <CreateAssessmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAssessment}
        isLoading={isCreatingAssessment}
      />
    </div>
  );
};