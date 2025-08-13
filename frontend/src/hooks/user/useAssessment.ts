import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuth } from "@/hooks/shared/useAuth";
import {
  useOfflineQuestions,
  useOfflineAssessment,
  useOfflineAssessmentsMutation,
  useOfflineResponsesMutation,
  useOfflineSyncStatus,
  useOfflineDraftAssessments,
} from "../../hooks/useOfflineApi";
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

export const useAssessment = () => {
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
            const savedResponses = await offlineDB.getResponsesByAssessment(actualAssessment.assessment_id);
            if (savedResponses.length !== allResponsesToSave.length) {
              // Partial save warning handled silently
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
  const canCreate = allRoles.includes("org_admin");

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
            const savedResponses = await offlineDB.getResponsesByAssessment(assessmentId);
            if (savedResponses.length !== responsesToSend.length) {
              // Partial save warning handled silently
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

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return {
    // State
    currentCategoryIndex,
    answers,
    showPercentInfo,
    setShowPercentInfo,
    hasCreatedAssessment,
    creationAttempts,
    pendingSubmissions,
    showSuccessModal,
    setShowSuccessModal,
    showCreateModal,
    setShowCreateModal,
    isCreatingAssessment,
    toolName,
    currentLanguage,
    isOnline,

    // Data
    questionsData,
    questionsLoading,
    assessmentDetail,
    assessmentLoading,
    assessmentsData,
    assessmentsLoading,
    assessmentMutationPending,
    responseMutationPending,

    // Computed values
    categories,
    groupedQuestions,
    currentCategory,
    currentQuestions,
    progress,
    isLastCategory,
    isOrgUser,
    canCreate,
    orgInfo,

    // Functions
    handleSelectAssessment,
    handleCreateAssessment,
    submitAssessment,
    getRevisionKey,
    handleAnswerChange,
    handleFileUpload,
    nextCategory,
    previousCategory,
    isCurrentCategoryComplete,
    refetchAssessments,
  };
}; 