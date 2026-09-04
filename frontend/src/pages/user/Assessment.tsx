import { AssessmentList } from "@/components/shared/AssessmentList";
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/shared/useAuth";
import i18n from "@/i18n";
import type {
  AssessmentDetailResponse,
  Assessment as AssessmentType,
  CreateAssessmentRequest,
  CreateResponseRequest,
  Question,
  QuestionRevision,
} from "@/openapi-rq/requests/types.gen";
import type { OfflineSubmission } from "@/types/offline";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Info, Lock, Paperclip, Send, Users, WifiOff } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useOfflineCategoryCatalogs
} from "@/hooks/useCategoryCatalogs";
import { invalidateAndRefetch } from "@/hooks/useOfflineApi";
import {
  useOfflineAssessment,
  useOfflineAssessmentsMutation,
  useOfflineDraftAssessments,
} from "@/hooks/useOfflineAssessments";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import {
  useOfflineResponses,
  useOfflineResponsesMutation,
} from "@/hooks/useOfflineResponses";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import { useOfflineUsers } from "@/hooks/useOfflineUsers";
import { offlineDB } from "../../services/indexeddb";
import { DataTransformationService } from "../../services/dataTransformation";

type FileData = { name: string; url: string };

type LocalAnswer = {
  response_id?: string;
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

type QuestionWithCategory = Question & {
  category: string;
  category_id?: string;
  latest_revision: QuestionRevision;
};

// Type guard for AssessmentDetailResponse
function isAssessmentDetailResponse(
  data: AssessmentType | AssessmentDetailResponse | undefined
): data is AssessmentDetailResponse {
  return !!data && "assessment" in data && !!data.assessment;
}

// Type guard for assessment result
function isAssessmentResult(result: unknown): result is { assessment: AssessmentType; offline?: boolean } {
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
  const queryClient = useQueryClient();

  const currentLanguage = localStorage.getItem("i18n_language") || i18n.language || "en";
  const { isOnline } = useOfflineSyncStatus();

  const allRoles = React.useMemo(() => {
    if (!user) return [];
    return [...(user.roles || []), ...(user.realm_access?.roles || [])].map((r) => r.toLowerCase());
  }, [user]);

  const isOrgAdmin = React.useMemo(() => allRoles.includes("org_admin"), [allRoles]);

  // Categories that the org_admin has delegated to Org_Users — they cannot answer these
  const [delegatedCategories, setDelegatedCategories] = useState<string[]>([]);

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [showPercentInfo, setShowPercentInfo] = useState<string | null>(null);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);
  const [creationAttempts, setCreationAttempts] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<OfflineSubmission[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [showEditAssignments, setShowEditAssignments] = useState(false);
  const [editAssignedUserIds, setEditAssignedUserIds] = useState<string[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [hasExistingResponses, setHasExistingResponses] = useState(false);
  const toolName = t("sustainability") + " " + t("assessmentLabel");

  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const { data: assessmentDetail, isLoading: assessmentLoading, error: assessmentError } = useOfflineAssessment(assessmentId || "");
  const { data: categoriesData, isLoading: categoriesLoading } = useOfflineCategoryCatalogs();
  const { data: assessmentsData, isLoading: assessmentsLoading, refetch: refetchAssessments } = useOfflineDraftAssessments();
  const { data: existingResponses, isLoading: responsesLoading } = useOfflineResponses(assessmentId || "");
  const { createAssessment, updateAssessment, submitDraftAssessment: submitDraftAssessmentHook, isPending: assessmentMutationPending } = useOfflineAssessmentsMutation();
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

  // Load existing responses into answers state
  useEffect(() => {
    console.log('🔍 Loading existing responses:', existingResponses);
    if (existingResponses?.responses && existingResponses.responses.length > 0) {
      const loadedAnswers: Record<string, LocalAnswer> = {};

      existingResponses.responses.forEach((response: any) => {
        try {
          console.log('🔍 Processing response:', response);

          // Standardize response parsing - handle potential older array format or standard string format
          let responseRaw = response.response;
          if (Array.isArray(responseRaw) && (responseRaw as any).length > 0) {
            responseRaw = (responseRaw as any)[0];
          }

          if (!responseRaw) return;

          const responseData = typeof responseRaw === 'string' ? JSON.parse(responseRaw) : responseRaw;
          console.log('🔍 Parsed response data:', responseData);

          if (responseData && typeof responseData === 'object') {
            loadedAnswers[response.question_revision_id] = {
              response_id: response.response_id,
              yesNo: responseData.yesNo,
              percentage: responseData.percentage,
              text: responseData.text || '',
              files: responseData.files || []
            };
            console.log('✅ Loaded answer for question:', response.question_revision_id, loadedAnswers[response.question_revision_id]);
          }
        } catch (error) {
          console.warn('Failed to parse response data:', error, response);
        }
      });

      console.log('📝 Setting loaded answers:', loadedAnswers);
      setAnswers(loadedAnswers);
      setHasExistingResponses(true);
    } else {
      console.log('📝 No existing responses found');
      setHasExistingResponses(false);
    }
  }, [existingResponses]);

  const orgInfo = React.useMemo(() => {
    if (!user) return { orgId: "", categories: [] };

    const allRoles = [...(user.roles || []), ...(user.realm_access?.roles || [])].map((r) => r.toLowerCase());
    const isOrgAdmin = allRoles.includes("org_admin");

    let orgId = "";
    if (user.organizations && typeof user.organizations === "object") {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgData = (user.organizations as Record<string, { id: string }>)[orgKeys[0]];
        orgId = orgData?.id || "";
      }
    }

    // For a regular user, their categories are directly on the user object.
    // For an admin, we don't need their categories here, as filtering is handled elsewhere.
    // For a regular user, their categories are directly on the user object as an array of UUIDs.
    const userCategories = (!isOrgAdmin && Array.isArray(user.categories)) ? user.categories as string[] : [];

    return { orgId, categories: userCategories };
  }, [user]);

  // Org users for assigning assessments (org_admin only)
  const { data: orgUsers } = useOfflineUsers(isOrgAdmin ? orgInfo.orgId : undefined);

  // Fetch delegated categories for org_admin so we can lock those in the UI
  useEffect(() => {
    if (!isOrgAdmin || !orgInfo.orgId) return;

    const fetchDelegated = async () => {
      try {
        const token = (await import("@/services/shared/keycloakConfig")).keycloak.token;
        const res = await fetch(
          `/api/organizations/${orgInfo.orgId}/org-admin/assigned-categories`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setDelegatedCategories(data.assigned_categories || []);
        }
      } catch (e) {
        console.warn("Failed to fetch delegated categories", e);
      }
    };

    fetchDelegated();
  }, [isOrgAdmin, orgInfo.orgId]);

  const organizationCategories = React.useMemo(() => {
    if (!categoriesData || !orgInfo.categories) {
      return [];
    }
    const orgCategoryNames = new Set(orgInfo.categories.map((c: string) => c.toLowerCase()));
    return categoriesData
      .filter((c: { name: string; }) => orgCategoryNames.has(c.name.toLowerCase()))
      .map((c: { name: string; }) => c.name);
  }, [categoriesData, orgInfo.categories]);

  // Extract assessment category IDs from assessment detail
  const assessmentCategoryIds = React.useMemo(() => {
    if (!assessmentDetail) return [];

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    return actualAssessment.categories || [];
  }, [assessmentDetail]);

  // Assessment creation logic
  useEffect(() => {
    if (!user) return;

    if (!assessmentId && !isOrgAdmin) {
      toast.error(t("assessment.noPermissionToCreate"));
      navigate("/dashboard");
      return;
    }
  }, [assessmentId, user, navigate, t, isOrgAdmin]);

  // Handle assessment selection
  const handleSelectAssessment = (selectedAssessmentId: string) => {
    navigate(`/user/assessment/${selectedAssessmentId}`);
  };

  // Open the edit-assigned-users dialog for the current assessment
  const openEditAssignments = () => {
    let currentAssigned: string[] = [];
    if (assessmentDetail) {
      if (isAssessmentDetailResponse(assessmentDetail)) {
        currentAssigned = assessmentDetail.assessment.assigned_user_ids || [];
      } else {
        currentAssigned = (assessmentDetail as AssessmentType).assigned_user_ids || [];
      }
    }
    setEditAssignedUserIds(currentAssigned);
    setShowEditAssignments(true);
  };

  // Save the edited list of assigned users
  const saveEditAssignments = async () => {
    if (!assessmentId) return;
    setIsSavingAssignments(true);
    try {
      await updateAssessment(assessmentId, {
        language: currentLanguage,
        assigned_user_ids: editAssignedUserIds,
      });
      apiInterceptor.invalidateRecentGet('assessments', assessmentId);
      apiInterceptor.invalidateRecentGet('draft_assessments');
      apiInterceptor.invalidateRecentGet('users');
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'assessments' } }));
      toast.success(t("assessment.assignmentsUpdated"));
      setShowEditAssignments(false);
      invalidateAndRefetch(queryClient, ['assessments']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("assessment.assignmentsUpdateFailed"));
    } finally {
      setIsSavingAssignments(false);
    }
  };

  // Handle assessment creation from modal
  const handleCreateAssessment = async (assessmentName: string, categories?: string[], assignedUserIds?: string[]) => {
    if (creationAttempts >= 3) {
      toast.error(t("assessment.maxRetriesExceeded"));
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
      categories: categories,
      assigned_user_ids: assignedUserIds,
    };

    createAssessment(newAssessment, {
      onSuccess: (result: unknown) => {
        console.log("Assessment creation onSuccess result:", result);
        if (result && isAssessmentResult(result) && result.assessment?.assessment_id) {
          const assessmentIdToNavigate = result.assessment.assessment_id;

          // Invalidate and refetch the assessments query to ensure immediate visibility
          invalidateAndRefetch(queryClient, ['assessments']);

          // Navigate immediately to the assessment, whether it's a temp_ ID or a real ID
          navigate(`/user/assessment/${assessmentIdToNavigate}`);

          // If it's a temporary assessment, we don't need to wait for it to be saved
          // The useOfflineAssessment hook will handle loading it from IndexedDB
          if (assessmentIdToNavigate.startsWith("temp_")) {
            toast.success(t("assessment.offlineCreated"));
          } else {
            toast.success(t("assessment.createdSuccessfully"));
          }
        } else {
          console.error("Assessment creation result did not contain a valid assessment_id:", result);
          toast.error(t("assessment.failedToCreate"));
          setHasCreatedAssessment(false);
        }
        setShowCreateModal(false);
        setIsCreatingAssessment(false);
      },
      onError: (error) => {
        console.error("Error creating assessment:", error);
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
        toast.error(t("assessment.creationTimeout"));
        setHasCreatedAssessment(false);
        navigate("/dashboard");
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [hasCreatedAssessment, assessmentId, navigate, t]);

  // Submit assessment
  // Save current user's visible category responses and navigate away.
  // Does NOT submit the whole assessment to draft — that only happens when ALL categories are answered.
  const finishCurrentCategories = async () => {
    if (!assessmentDetail) {
      toast.error(t("assessment.failedToSubmit"));
      return;
    }

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    if (!actualAssessment.assessment_id) {
      toast.error(t("assessment.failedToSubmit"));
      return;
    }

    if (!isCurrentCategoryComplete()) {
      toast.error(t("assessment.completeAllQuestionsNext"));
      return;
    }

    try {
      // Only save the current category's responses (same as nextCategory does)
      const currentQuestions = getCurrentCategoryQuestions();
      const responsesToSave: CreateResponseRequest[] = currentQuestions
        .map(({ revision }) => {
          const key = getRevisionKey(revision);
          if (!key) return null;
          const answer = answers[key];
          if (!answer) return null;
          return createResponseToSave(key, answer);
        })
        .filter((r): r is CreateResponseRequest => r !== null);

      if (responsesToSave.length > 0) {
        await createResponses(actualAssessment.assessment_id, responsesToSave, {
          onSuccess: async () => {
            toast.success(t("assessment.responsesSavedPortionComplete"));
            navigate("/dashboard");
          },
          onError: () => {
            toast.error(t("assessment.failedToSaveResponses"));
          },
        });
      } else {
        // Nothing to save (e.g. delegated category) — just navigate
        navigate("/dashboard");
      }
    } catch (error) {
      if (!navigator.onLine) {
        navigate("/dashboard");
      } else {
        toast.error(t("assessment.failedToSubmit"));
      }
    }
  };

  // Submit the entire assessment to draft — only callable when ALL categories are answered.
  const submitAssessment = async () => {
    if (!assessmentDetail) {
      toast.error(t("assessment.failedToSubmit"));
      return;
    }

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    if (!actualAssessment.assessment_id) {
      toast.error(t("assessment.failedToSubmit"));
      return;
    }

    try {
      const allResponsesToSave: CreateResponseRequest[] = [];
      let allQuestionsAnswered = true;

      for (const categoryName of categories) {
        const categoryQuestions = groupedQuestions[categoryName] || [];
        for (const { revision } of categoryQuestions) {
          const key = getRevisionKey(revision);
          if (!key) continue;
          const answer = answers[key];
          if (answer && isAnswerComplete(answer)) {
            allResponsesToSave.push(createResponseToSave(key, answer));
          } else {
            allQuestionsAnswered = false;
          }
        }
      }

      if (!allQuestionsAnswered) {
        toast.error(t("assessment.incompleteCategories"));
        return;
      }

      if (allResponsesToSave.length > 0) {
        await createResponses(actualAssessment.assessment_id, allResponsesToSave, {
          onSuccess: async () => {
            // Fetch the latest saved responses from IndexedDB (includes just-saved ones)
            const savedResponses = await offlineDB.getResponsesByAssessment(actualAssessment.assessment_id);
            const savedResponseMap = new Map(savedResponses.map((r: any) => [r.question_revision_id, r]));

            // Check if the COMPLETE assessment across ALL categories is answered
            // using the fresh IndexedDB data instead of stale existingResponses
            const categoriesInQuestions = new Set(allAssessmentQuestions.map(q => q.category_id));
            const allCategoriesAccountedFor = assessmentCategoryIds.length > 0 && assessmentCategoryIds.every(cid => categoriesInQuestions.has(cid));

            const isEntireAssessmentComplete = allCategoriesAccountedFor && allAssessmentQuestions.every(q => {
              const key = getRevisionKey(q.revision);
              if (!key) return false;

              // Check in-memory answers first (current session)
              const currentAnswer = answers[key];
              if (currentAnswer && isAnswerComplete(currentAnswer)) return true;

              // Check freshly saved IndexedDB responses
              const savedResponse = savedResponseMap.get(key);
              if (savedResponse) {
                try {
                  const parsed = JSON.parse(Array.isArray(savedResponse.response) ? savedResponse.response[0] : savedResponse.response);
                  return isAnswerComplete(parsed);
                } catch (e) {
                  return typeof savedResponse.response === 'object' && savedResponse.response !== null;
                }
              }

              return false;
            });

            if (isEntireAssessmentComplete) {
              await submitDraftAssessmentHook(actualAssessment.assessment_id, {
                onSuccess: () => {
                  toast.success(
                    isOnline
                      ? t("assessment.draftSubmittedSuccessfully")
                      : t("assessment.draftQueuedForSync")
                  );
                  navigate("/dashboard");
                },
                onError: () => {
                  if (!isOnline) {
                    navigate("/dashboard");
                  } else {
                    toast.error(t("assessment.failedToSubmitDraft"));
                  }
                },
              });
            } else {
              toast.error(t("assessment.incompleteCategories"));
            }
          },
          onError: () => {
            toast.error(t("assessment.failedToSaveResponses"));
          },
        });
      } else {
        toast.error(t("assessment.noResponsesToSubmit"));
      }
    } catch (error) {
      if (!navigator.onLine) {
        navigate("/dashboard");
      } else {
        toast.error(t("assessment.failedToSubmit"));
      }
    }
  };

  // Group questions by category - use intersection of assessment categories and user categories
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData || !categoriesData) return {};

    // Create lookup maps for categories
    const categoryIdToNameMap = new Map<string, string>();
    const categoryNameToIdMap = new Map<string, string>();
    categoriesData.forEach((cat: { category_catalog_id: string; name: string; }) => {
      categoryIdToNameMap.set(cat.category_catalog_id, cat.name);
      categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
    });

    const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};

    // Group questions by their proper category ID, handling legacy data
    (questionsData as unknown as QuestionWithCategory[]).forEach((question) => {
      if (question) {
        let categoryId: string | undefined;
        // The question might have the correct UUID in category_id
        if (question.category_id && categoryIdToNameMap.has(question.category_id)) {
          categoryId = question.category_id;
        }
        // Or it might have the name in category_id (legacy issue)
        else if (question.category_id && categoryNameToIdMap.has(question.category_id.toLowerCase())) {
          categoryId = categoryNameToIdMap.get(question.category_id.toLowerCase());
        }
        // Or it might have the name in the category property
        else if (question.category && categoryNameToIdMap.has(question.category.toLowerCase())) {
          categoryId = categoryNameToIdMap.get(question.category.toLowerCase());
        }

        if (categoryId) {
          if (!groups[categoryId]) {
            groups[categoryId] = [];
          }
          groups[categoryId].push({
            question,
            revision: question.latest_revision,
          });
        }
      }
    });

    const filtered: typeof groups = {};

    // Filter questions based on user role using category IDs and sort them
    for (const assessmentCatId of assessmentCategoryIds) {
      if (groups[assessmentCatId]) {
        // Sort questions by display_order
        const sortedQuestions = [...groups[assessmentCatId]].sort((a, b) => {
          const orderA = (a.question as any).display_order || 0;
          const orderB = (b.question as any).display_order || 0;
          return orderA - orderB;
        });

        if (isOrgAdmin) {
          // Admins see all categories assigned to the assessment
          filtered[assessmentCatId] = sortedQuestions;
        } else {
          // Regular users see only the intersection of their categories and assessment categories
          const userHasCategory = orgInfo.categories.includes(assessmentCatId);
          if (userHasCategory) {
            filtered[assessmentCatId] = sortedQuestions;
          }
        }
      }
    }
    return filtered;
  }, [questionsData, categoriesData, assessmentCategoryIds, orgInfo.categories, user, isOrgAdmin]);

  // Get ALL questions for the entire assessment to check for full completion
  const allAssessmentQuestions = React.useMemo(() => {
    if (!questionsData || !categoriesData || !assessmentCategoryIds.length) return [];

    const categoryIdToNameMap = new Map<string, string>();
    const categoryNameToIdMap = new Map<string, string>();
    categoriesData.forEach((cat: { category_catalog_id: string; name: string; }) => {
      categoryIdToNameMap.set(cat.category_catalog_id, cat.name);
      categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
    });

    const questions: { question: Question; revision: QuestionRevision; category_id: string }[] = [];

    (questionsData as unknown as QuestionWithCategory[]).forEach((q) => {
      if (q) {
        let catId: string | undefined;
        if (q.category_id && categoryIdToNameMap.has(q.category_id)) {
          catId = q.category_id;
        } else if (q.category_id && categoryNameToIdMap.has(q.category_id.toLowerCase())) {
          catId = categoryNameToIdMap.get(q.category_id.toLowerCase());
        } else if (q.category && categoryNameToIdMap.has(q.category.toLowerCase())) {
          catId = categoryNameToIdMap.get(q.category.toLowerCase());
        }

        if (catId && assessmentCategoryIds.includes(catId)) {
          questions.push({
            question: q,
            revision: q.latest_revision,
            category_id: catId
          });
        }
      }
    });

    return questions;
  }, [questionsData, categoriesData, assessmentCategoryIds]);

  const categories = Object.keys(groupedQuestions);

  // Check if we have any categories - only show this message for Org_User, not org_admin
  const isOrgUser = allRoles.includes("org_user") && !isOrgAdmin;

  // Returns true if the org_admin has delegated the current category to an Org_User.
  // Must be defined before any early returns to satisfy React's rules of hooks.
  const isCurrentCategoryDelegated = React.useMemo(() => {
    if (!isOrgAdmin || delegatedCategories.length === 0) return false;
    const currentCategoryId = categories[currentCategoryIndex];
    if (!currentCategoryId) return false;
    // delegatedCategories contains category_catalog_id UUIDs — direct comparison, no name matching
    return delegatedCategories.includes(currentCategoryId);
  }, [isOrgAdmin, delegatedCategories, categories, currentCategoryIndex]);

  if (assessmentCategoryIds.length > 0 && categories.length === 0 && isOrgUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("assessment.noCategoriesTitle")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("assessment.noCategoriesDescription")}
          </p>
          <Button onClick={() => navigate("/dashboard")}>{t("assessment.backToDashboard")}</Button>
        </div>
      </div>
    );
  }

  // Show assessment list if no specific assessment is selected
  if (!assessmentId) {
    const canCreate = isOrgAdmin;

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
                {t('assessment.selectAssessment')}
              </h1>
              <p className="text-lg text-gray-600">
                {t('assessment.selectAssessmentDescription')}
              </p>
            </div>

            {canCreate && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t('assessment.createNewAssessment')}
                </Button>
              </div>
            )}

            <AssessmentList
              assessments={assessmentsData?.assessments || []}
              onSelectAssessment={handleSelectAssessment}
              isLoading={assessmentsLoading}
              onAssessmentDeleted={refetchAssessments}
            />

            {/* Create Assessment Modal */}
            <CreateAssessmentModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreateAssessment}
              isLoading={isCreatingAssessment}
              isOrgAdmin={isOrgAdmin}
              orgUsers={orgUsers}
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
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [question_revision_id]: { ...prev[question_revision_id], ...value } as LocalAnswer,
      };

      // Auto-save to IndexedDB
      const answer = updated[question_revision_id];
      if (answer) {
        const responseToSave = createResponseToSave(question_revision_id, answer);
        // Look up question text and category so review can display them correctly
        const questionInfo = allAssessmentQuestions.find(q => getRevisionKey(q.revision) === question_revision_id);
        const qText = questionInfo?.revision?.text;
        const categoryId = questionInfo?.category_id || '';
        const categoryCatalog = categoriesData?.find(c => c.category_catalog_id === categoryId);
        const categoryName = categoryCatalog?.name || '';
        let questionText = '';
        if (qText) {
          if (typeof qText === 'string') {
            questionText = qText;
          } else if (typeof qText === 'object' && qText !== null) {
            questionText = (qText as Record<string, string>)[currentLanguage]
              || (qText as Record<string, string>).en
              || Object.values(qText).find(v => typeof v === 'string') as string
              || '';
          }
        }
        const offlineResponse = DataTransformationService.transformResponse(
          responseToSave,
          questionText,
          categoryName,
          assessmentId
        );
        // Save the generated response_id back into our state so we don't recreate it
        updated[question_revision_id] = { ...answer, response_id: offlineResponse.response_id };
        offlineDB.saveResponse(offlineResponse).catch(err =>
          console.error('Failed to auto-save answer:', err)
        );
      }

      return updated;
    });
  };
  const createResponseToSave = (key: string, answer: LocalAnswer): CreateResponseRequest & { response_id?: string } => ({
    response_id: answer.response_id,
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
      setAnswers((prev) => {
        const updated = {
          ...prev,
          [questionId]: { ...prev[questionId], files: [...(prev[questionId]?.files || []), fileData] },
        };

        // Auto-save to IndexedDB for file uploads
        const answer = updated[questionId];
        if (answer) {
          const responseToSave = createResponseToSave(questionId, answer);
          const offlineResponse = DataTransformationService.transformResponse(
            responseToSave,
            '',
            '',
            assessmentId
          );
          // Save the generated response_id back into our state so we don't recreate it
          updated[questionId] = { ...answer, response_id: offlineResponse.response_id };
          offlineDB.saveResponse(offlineResponse).catch(err =>
            console.error('Failed to auto-save after file upload:', err)
          );
        }

        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const nextCategory = async () => {
    if (!isCurrentCategoryDelegated && !isCurrentCategoryComplete()) {
      toast.error(t("assessment.completeAllQuestionsNext"));
      return;
    }

    // Only save responses if this category is not delegated
    if (!isCurrentCategoryDelegated) {
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
              toast.error(t("assessment.failedToSaveResponses"));
            },
          });
        } catch (error) {
          toast.error(t("assessment.failedToSaveResponses"));
        }
      }
    } // end if (!isCurrentCategoryDelegated)

    if (currentCategoryIndex < categories.length - 1) {
      setCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const previousCategory = () => {
    if (currentCategoryIndex > 0) {
      setCategoryIndex(currentCategoryIndex - 1);
    }
  };

  const renderQuestionInput = (revision: QuestionRevision, disabled = false) => {
    const key = getRevisionKey(revision);
    const yesNoValue = answers[key]?.yesNo;
    const percentageValue = answers[key]?.percentage;
    const textValue = answers[key]?.text || "";
    const files: FileData[] = answers[key]?.files || [];

    if (disabled) {
      return (
        <div className="space-y-4 opacity-50 pointer-events-none select-none">
          <div>
            <Label>{t("assessment.yesNo")} <span className="text-red-500">*</span></Label>
            <div className="flex space-x-4 mt-1">
              <Button type="button" variant="outline" disabled>{t("common.yes")}</Button>
              <Button type="button" variant="outline" disabled>{t("common.no")}</Button>
            </div>
          </div>
          <div>
            <Label>{t("assessment.percentage")} <span className="text-red-500">*</span></Label>
            <div className="flex space-x-2 mt-1">
              {[0, 25, 50, 75, 100].map((val) => (
                <Button key={val} type="button" variant="outline" disabled>{val}%</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("assessment.yourResponse")} <span className="text-red-500">*</span></Label>
            <Textarea className="mt-1" rows={4} disabled placeholder={t("assessment.enterYourResponse")} />
          </div>
        </div>
      );
    }

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
              {t("common.yes")}
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={yesNoValue === false ? "bg-red-500 hover:bg-red-600" : ""}
              onClick={() => handleAnswerChange(key, { yesNo: false })}
            >
              {t("common.no")}
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
              onClick={() => setShowPercentInfo(showPercentInfo === key ? null : key)}
              aria-label={t("staticText.assessment.showPercentageExplanation")}
            >
              <Info className="w-4 h-4" />
            </button>
            {showPercentInfo === key && (
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
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange(key, { text: e.target.value })}
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


  if (assessmentLoading || responsesLoading || categoriesLoading) {
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }

  // If loading is done but we have an error or no assessment detail, show a friendly
  // error state instead of a perpetual spinner. This prevents a "blank page" / stuck
  // spinner when offline and the assessment is not in local cache.
  if (!assessmentDetail || assessmentError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-dgrv-blue mb-2">{t("assessment.loadFailedTitle", "Assessment Unavailable")}</h2>
            <p className="text-gray-600 mb-4">
              {t("assessment.loadFailedMessage", "The assessment could not be loaded. If you are offline, please reconnect to load the latest data.")}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="default" onClick={() => navigate("/dashboard")}>
                {t("assessment.backToDashboard", "Back to Dashboard")}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t("assessment.retry", "Retry")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCategoryId = categories[currentCategoryIndex];
  const currentCategoryObject = categoriesData?.find((c: { category_catalog_id: string; }) => c.category_catalog_id === currentCategoryId);
  const currentCategoryName = (() => {
    if (!currentCategoryObject) return t("assessment.unknownCategory");
    const translations = (currentCategoryObject as any).name_translations as Record<string, string> | undefined;
    const translated = translations && typeof translations[currentLanguage] === "string" ? translations[currentLanguage] : undefined;
    return translated || currentCategoryObject.name || t("assessment.unknownCategory");
  })();
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = categories.length > 0 ? ((currentCategoryIndex + 1) / categories.length) * 100 : 0;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dgrv-blue mb-2">{toolName}</h1>
              <p className="text-lg text-gray-600">
                {t("category")} {currentCategoryIndex + 1} {t("of")} {categories.length}: {currentCategoryName}
              </p>
            </div>
            {isOrgAdmin && assessmentId && (
              <Button
                variant="outline"
                onClick={openEditAssignments}
                className="flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>{t("assessment.editAssignedUsers")}</span>
              </Button>
            )}
          </div>
          {!isOnline && (
            <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
              <WifiOff className="w-4 h-4 shrink-0" />
              {t('connection.offlineBanner')}
            </div>
          )}
        </div>

        {!isOnline && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-800">
                    {t("assessment.offlineMode")}
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
                  {t('syncNow')}
                </Button>
              </div>
              {pendingSubmissions.length > 0 && (
                <div className="mt-2 text-xs text-orange-700">
                  {t("assessment.pendingSubmissions")} {pendingSubmissions.length}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasExistingResponses && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">
                  {t("assessment.existingResponses")}
                </span>
              </div>
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
                    {t("assessment.onlineWithPending")}
                  </span>
                </div>
                <div className="text-xs text-green-700">
                  {t("assessment.pendingSubmissions")} {pendingSubmissions.length}
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
            <CardTitle className="text-xl text-dgrv-blue">
              {currentCategoryName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {isCurrentCategoryDelegated && (
              <div className="flex items-center space-x-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 mb-2">
                <Lock className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  {t("assessment.categoryDelegatedBanner")}
                </p>
              </div>
            )}
            {currentQuestions.map((question, index) => {
              let questionText = "";
              if (typeof question.revision.text === "object" && question.revision.text !== null) {
                const textObj = question.revision.text as Record<string, string>;
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
                  {renderQuestionInput(question.revision, isCurrentCategoryDelegated)}
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
                onClick={finishCurrentCategories}
                className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
                disabled={!isCurrentCategoryComplete() || isCurrentCategoryDelegated}
              >
                <Send className="w-4 h-4" />
                <span>{t("assessment.finish")}</span>
              </Button>
            ) : (
              <Button
                onClick={nextCategory}
                className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
                disabled={!isCurrentCategoryComplete() && !isCurrentCategoryDelegated}
              >
                <span>{t("next")}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <CreateAssessmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAssessment}
        isLoading={isCreatingAssessment}
        isOrgAdmin={isOrgAdmin}
        orgUsers={orgUsers}
      />

      {/* Edit Assigned Users Dialog */}
      <Dialog open={showEditAssignments} onOpenChange={(open) => { if (!open) setShowEditAssignments(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {t("assessment.editAssignedUsers")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
            {(orgUsers || []).length > 0 ? (
              orgUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`edit-assign-${user.id}`}
                    checked={editAssignedUserIds.includes(user.id!)}
                    onChange={(e) => {
                      const userId = user.id!;
                      if (e.target.checked) {
                        setEditAssignedUserIds([...editAssignedUserIds, userId]);
                      } else {
                        setEditAssignedUserIds(editAssignedUserIds.filter(u => u !== userId));
                      }
                    }}
                    className="h-4 w-4 text-dgrv-blue focus:ring-dgrv-blue border-gray-300 rounded"
                  />
                  <label htmlFor={`edit-assign-${user.id}`} className="text-sm text-gray-700">
                    {user.email || user.username || user.id}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center p-4">
                {t("assessment.noUsersToAssign")}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditAssignments(false)} disabled={isSavingAssignments}>
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-dgrv-blue hover:bg-blue-700"
              onClick={saveEditAssignments}
              disabled={isSavingAssignments}
            >
              {isSavingAssignments ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
