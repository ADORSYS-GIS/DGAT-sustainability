/**
 * @file Assessment.tsx
 * @description This file defines the main component for the Assessment page.
 */
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { Navbar } from "@/components/shared/Navbar";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { invalidateAndRefetch } from "@/hooks/useOfflineApi";
import {
  useOfflineAssessment,
  useOfflineAssessmentsMutation,
} from "@/hooks/useOfflineAssessments";
import { useOfflineResponses, useOfflineResponsesMutation } from "@/hooks/useOfflineResponses";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import i18n from "@/i18n";
import {
  Assessment as AssessmentType,
  CreateAssessmentRequest,
  CreateResponseRequest,
} from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "@/services/indexeddb";
import type { OfflineSubmission } from "@/types/offline";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AssessmentHeader } from "@/components/pages/user/Assessment/AssessmentHeader";
import { AssessmentSelection } from "@/components/pages/user/Assessment/AssessmentSelection";
import { CategoryQuestions } from "@/components/pages/user/Assessment/CategoryQuestions";
import { Loading } from "@/components/pages/user/Assessment/Loading";
import { NavigationControls } from "@/components/pages/user/Assessment/NavigationControls";
import { NoCategories } from "@/components/pages/user/Assessment/NoCategories";
import { StatusCards } from "@/components/pages/user/Assessment/StatusCards";
import { useAssessmentData, useFilteredQuestions } from "@/components/pages/user/Assessment/hooks";
import {
  LocalAnswer,
  createResponseToSave,
  getRevisionKey,
  isAnswerComplete,
  isAssessmentDetailResponse,
} from "@/components/pages/user/Assessment/services";

function isAssessmentResult(
  result: unknown
): result is { assessment: AssessmentType; offline?: boolean } {
  return (
    !!result &&
    typeof result === "object" &&
    result !== null &&
    "assessment" in result
  );
}

export const Assessment: React.FC = () => {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentLanguage =
    localStorage.getItem("i18n_language") || i18n.language || "en";
  const { isOnline } = useOfflineSyncStatus();

  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [pendingSubmissions, setPendingSubmissions] = useState<
    OfflineSubmission[]
  >([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [hasExistingResponses, setHasExistingResponses] = useState(false);

  const {
    data: assessmentDetail,
    isLoading: assessmentLoading,
  } = useOfflineAssessment(assessmentId || "");
  const { data: categoriesData, isLoading: categoriesLoading } =
    useOfflineCategoryCatalogs();
  const { data: existingResponses, isLoading: responsesLoading } =
    useOfflineResponses(assessmentId || "");
  const { createAssessment, submitDraftAssessment: submitDraftAssessmentHook } =
    useOfflineAssessmentsMutation();
  const { createResponses } = useOfflineResponsesMutation();

  const { user: authUser, allRoles, isOrgAdmin, orgInfo, groupedQuestions } =
    useAssessmentData(assessmentId);

  const {
    filteredGroupedQuestions,
    categories,
    assessmentCategoryIds,
  } = useFilteredQuestions(
    groupedQuestions,
    assessmentDetail,
    isOrgAdmin,
    orgInfo
  );

  useEffect(() => {
    const checkPendingSubmissions = async () => {
      try {
        const submissions = await offlineDB.getAllSubmissions();
        setPendingSubmissions(
          submissions.filter((sub) => sub.sync_status === "pending")
        );
      } catch (error) {
        console.error("Failed to check pending submissions:", error);
      }
    };
    checkPendingSubmissions();
  }, [isOnline]);

  useEffect(() => {
    if (existingResponses?.responses && existingResponses.responses.length > 0) {
      const loadedAnswers: Record<string, LocalAnswer> = {};
      existingResponses.responses.forEach((response: CreateResponseRequest) => {
        try {
          const responseData = JSON.parse(
            response.response[0] || response.response
          );
          if (responseData && typeof responseData === "object") {
            loadedAnswers[response.question_revision_id] = {
              yesNo: responseData.yesNo,
              percentage: responseData.percentage,
              text: responseData.text || "",
              files: responseData.files || [],
            };
          }
        } catch (error) {
          console.warn("Failed to parse response data:", error, response);
        }
      });
      setAnswers(loadedAnswers);
      setHasExistingResponses(true);
    } else {
      setHasExistingResponses(false);
    }
  }, [existingResponses]);

  const handleSelectAssessment = (selectedAssessmentId: string) => {
    navigate(`/user/assessment/${selectedAssessmentId}`);
  };

  const handleCreateAssessment = async (
    assessmentName: string,
    categories?: string[]
  ) => {
    setIsCreatingAssessment(true);
    const newAssessment: CreateAssessmentRequest = {
      language: currentLanguage,
      name: assessmentName,
      categories: categories,
    };

    createAssessment(newAssessment, {
      onSuccess: (result: unknown) => {
        if (
          result &&
          isAssessmentResult(result) &&
          result.assessment?.assessment_id
        ) {
          const assessmentIdToNavigate = result.assessment.assessment_id;
          invalidateAndRefetch(queryClient, ["assessments"]);
          navigate(`/user/assessment/${assessmentIdToNavigate}`);
          if (assessmentIdToNavigate.startsWith("temp_")) {
            toast.success(
              t(
                "assessment.offlineCreated",
                "Assessment created offline and will sync when online!"
              )
            );
          } else {
            toast.success(
              t(
                "assessment.createdSuccessfully",
                "Assessment created successfully!"
              )
            );
          }
        } else {
          toast.error(t("assessment.failedToCreate"));
        }
        setShowCreateModal(false);
        setIsCreatingAssessment(false);
      },
      onError: (error) => {
        console.error("Error creating assessment:", error);
        toast.error(t("assessment.failedToCreate"));
        setShowCreateModal(false);
        setIsCreatingAssessment(false);
      },
      organizationId: orgInfo.orgId,
      userEmail: user.email,
    });
  };

  const submitAssessment = async () => {
    if (!assessmentDetail) {
      toast.error(
        t(
          "assessment.failedToSubmit",
          "Assessment details not loaded. Please try again."
        )
      );
      return;
    }

    let actualAssessment: AssessmentType;
    if (isAssessmentDetailResponse(assessmentDetail)) {
      actualAssessment = assessmentDetail.assessment;
    } else {
      actualAssessment = assessmentDetail as AssessmentType;
    }

    if (!actualAssessment.assessment_id) {
      toast.error(
        t(
          "assessment.failedToSubmit",
          "Assessment ID is missing. Please try again."
        )
      );
      return;
    }

    try {
      const allResponsesToSave: CreateResponseRequest[] = [];
      for (const categoryName of categories) {
        const categoryQuestions = filteredGroupedQuestions[categoryName] || [];
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
            //
          },
          onError: () => {
            toast.error(
              t(
                "assessment.failedToSaveResponses",
                "Failed to save responses. Please try again."
              )
            );
          },
        });

        await submitDraftAssessmentHook(actualAssessment.assessment_id, {
          onSuccess: () => {
            toast.success(
              isOnline
                ? t(
                    "assessment.draftSubmittedSuccessfully",
                    "Assessment submitted for admin approval!"
                  )
                : t(
                    "assessment.draftQueuedForSync",
                    "Assessment saved offline and will be submitted for approval when online."
                  )
            );
            navigate("/dashboard");
          },
          onError: () => {
            if (!isOnline) {
              navigate("/dashboard");
            } else {
              toast.error(
                t(
                  "assessment.failedToSubmitDraft",
                  "Failed to submit assessment for approval."
                )
              );
            }
          },
        });
      } else {
        toast.error(
          t(
            "assessment.noResponsesToSubmit",
            "No responses to submit for the current category."
          )
        );
      }
    } catch (error) {
      if (!navigator.onLine) {
        navigate("/dashboard");
      } else {
        toast.error(t("assessment.failedToSubmit", "Failed to submit assessment."));
      }
    }
  };

  const isOrgUser = allRoles.includes("org_user") && !isOrgAdmin;

  if (assessmentCategoryIds.length > 0 && categories.length === 0 && isOrgUser) {
    return <NoCategories />;
  }

  if (!assessmentId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <AssessmentSelection
          isOrgAdmin={isOrgAdmin}
          onSelectAssessment={handleSelectAssessment}
          onCreateAssessment={handleCreateAssessment}
          isCreatingAssessment={isCreatingAssessment}
        />
      </div>
    );
  }

  const handleAnswerChange = (
    question_revision_id: string,
    value: Partial<LocalAnswer>
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [question_revision_id]: {
        ...prev[question_revision_id],
        ...value,
      } as LocalAnswer,
    }));
  };

  const isCurrentCategoryComplete = () =>
    (filteredGroupedQuestions[categories[currentCategoryIndex]] || []).every(
      (q) => {
        const key = getRevisionKey(q.revision);
        return isAnswerComplete(answers[key]);
      }
    );

  const nextCategory = async () => {
    if (!isCurrentCategoryComplete()) {
      toast.error(t("assessment.completeAllQuestionsNext"));
      return;
    }
    const currentQuestions =
      filteredGroupedQuestions[categories[currentCategoryIndex]] || [];
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
            //
          },
          onError: () => {
            toast.error(
              t(
                "assessment.failedToSaveResponses",
                "Failed to save responses. Please try again."
              )
            );
          },
        });
      } catch (error) {
        toast.error(
          t(
            "assessment.failedToSaveResponses",
            "Failed to save responses. Please try again."
          )
        );
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

  if (assessmentLoading || responsesLoading || !assessmentDetail || categoriesLoading) {
    return <Loading />;
  }

  const currentCategoryId = categories[currentCategoryIndex];
  const currentCategoryObject = categoriesData?.find(
    (c: { category_catalog_id: string }) =>
      c.category_catalog_id === currentCategoryId
  );
  const currentCategoryName =
    currentCategoryObject?.name ||
    t("assessment.unknownCategory", "Unknown Category");
  const progress =
    categories.length > 0
      ? ((currentCategoryIndex + 1) / categories.length) * 100
      : 0;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AssessmentHeader
          toolName={t("sustainability") + " " + t("assessment")}
          currentCategoryIndex={currentCategoryIndex}
          categories={categories}
          currentCategoryName={currentCategoryName}
          progress={progress}
        />
        <StatusCards
          isOnline={isOnline}
          pendingSubmissions={pendingSubmissions}
          hasExistingResponses={hasExistingResponses}
        />
        <CategoryQuestions
          currentCategoryName={currentCategoryName}
          questions={filteredGroupedQuestions[categories[currentCategoryIndex]] || []}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          getRevisionKey={getRevisionKey}
          currentLanguage={currentLanguage}
        />
        <NavigationControls
          previousCategory={previousCategory}
          nextCategory={nextCategory}
          submitAssessment={submitAssessment}
          isCurrentCategoryComplete={isCurrentCategoryComplete}
          isLastCategory={isLastCategory}
          currentCategoryIndex={currentCategoryIndex}
        />
      </div>
      <CreateAssessmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAssessment}
        isLoading={isCreatingAssessment}
        isOrgAdmin={isOrgAdmin}
      />
    </div>
  );
};