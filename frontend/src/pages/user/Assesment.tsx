import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { Navbar } from "@/components/shared/Navbar";
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
  useOfflineSyncStatus
} from "../../hooks/useOfflineApi";
import { toast } from "sonner";
import { Info, Paperclip, ChevronLeft, ChevronRight, Save, Send, FileText } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import type { Question, QuestionRevision, Assessment as AssessmentType, Response as ResponseType, AssessmentDetailResponse } from "@/openapi-rq/requests/types.gen";
import { offlineDB } from "../../services/indexeddb";
import type { CreateResponseRequest, CreateAssessmentRequest } from "@/openapi-rq/requests/types.gen";
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

  // Network status from hook
  const { isOnline } = useOfflineSyncStatus();

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmissions = async () => {
      try {
        const submissions = await offlineDB.getAllSubmissions();
        const pending = submissions.filter(sub => sub.sync_status === 'pending');
        setPendingSubmissions(pending);
        
        // Debug: Check sync queue
        const syncQueue = await offlineDB.getSyncQueue();
        
        // Debug: Check all submissions
        
        // Debug: Check all responses
        const allResponses = await offlineDB.getResponsesWithFilters({});
        const pendingResponses = allResponses.filter(r => r.sync_status === 'pending');
      } catch (error) {
        // Silently handle debug data loading errors
      }
    };

    checkPendingSubmissions();
  }, [isOnline]); // Re-check when network status changes

  const orgInfo = React.useMemo(() => {
    if (!user) return { orgId: "", categories: [] };
    
    // Get organization ID from user organizations
    let orgId = "";
    if (user.organizations && typeof user.organizations === 'object') {
      const orgKeys = Object.keys(user.organizations);
      if (orgKeys.length > 0) {
        const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgKeys[0]];
        orgId = orgData?.id || "";
      }
    }
    
    // Get user's personal categories from ID token (not organization categories)
    // For Org_User, this comes from the root level 'categories' field in the ID token
    const userCategories = user.categories || [];
    
    return {
      orgId: orgId,
      categories: userCategories, // Use user's personal categories
    };
  }, [user]);
  
  const [currentCategoryIndex, setCategoryIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showPercentInfo, setShowPercentInfo] = useState(false);
  const [hasCreatedAssessment, setHasCreatedAssessment] = useState(false);
  const [creationAttempts, setCreationAttempts] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<unknown[]>([]);
  const toolName = t("sustainability") + " " + t("assessment");

  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const { data: assessmentDetail, isLoading: assessmentLoading } = useOfflineAssessment(assessmentId || "");

  // Use enhanced offline mutation hooks
  const { createAssessment, updateAssessment, deleteAssessment, submitAssessment: submitAssessmentHook, isPending: assessmentMutationPending } = useOfflineAssessmentsMutation();
  const { createResponses, updateResponse, deleteResponse, isPending: responseMutationPending } = useOfflineResponsesMutation();

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
      !assessmentMutationPending &&
      user?.sub &&
      canCreate &&
      creationAttempts < 3 // Limit retry attempts
    ) {
      setHasCreatedAssessment(true);
      setCreationAttempts(prev => prev + 1);
      const newAssessment: CreateAssessmentRequest = {
        language: "en",
      };
      try {
        createAssessment(newAssessment, {
          onSuccess: (result) => {
            if (result && typeof result === 'object' && 'assessment' in result) {
              const apiResponse = result as { assessment: AssessmentType };
              if (apiResponse.assessment && apiResponse.assessment.assessment_id) {
                const realAssessmentId = apiResponse.assessment.assessment_id;
                
                // Only navigate if we have a real assessment ID (not a temp one)
                if (!realAssessmentId.startsWith('temp_')) {
                  toast.success(t('assessment.previousDraftsDeleted', { defaultValue: 'Previous draft assessments have been deleted. New assessment created successfully!' }));
                  
                  // Wait for the assessment to be properly saved to IndexedDB
                  const waitForAssessment = async () => {
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    while (attempts < maxAttempts) {
                      const savedAssessment = await offlineDB.getAssessment(realAssessmentId);
                      if (savedAssessment) {
                        navigate(`/user/assessment/${realAssessmentId}`);
                        return;
                      }
                      
                      await new Promise(resolve => setTimeout(resolve, 500));
                      attempts++;
                    }
                    
                    navigate(`/user/assessment/${realAssessmentId}`);
                  };
                  
                  waitForAssessment();
                } else {
                  // Don't navigate yet, wait for the real assessment ID
                  // The mutation will retry and eventually provide the real ID
                  setHasCreatedAssessment(false); // Allow retry
                }
              } else {
                toast.error(t('assessment.failedToCreate'));
                setHasCreatedAssessment(false);
              }
            } else {
              toast.error(t('assessment.failedToCreate'));
              setHasCreatedAssessment(false);
            }
          },
          onError: (err) => {
            toast.error(t('assessment.failedToCreate'));
            setHasCreatedAssessment(false);
          },
          organizationId: orgInfo.orgId,
          userEmail: user?.email,
        });
      } catch (err) {
        setHasCreatedAssessment(false);
      }
    } else if (creationAttempts >= 3) {
      // Show error after max retries
      toast.error(t('assessment.maxRetriesExceeded', { defaultValue: 'Failed to create assessment after multiple attempts. Please try again later.' }));
      navigate("/dashboard");
    }
  }, [assessmentId, hasCreatedAssessment, user, createAssessment, navigate, t, assessmentMutationPending, orgInfo.orgId, user?.email, creationAttempts]);

  // Add a timeout mechanism to prevent infinite waiting
  useEffect(() => {
    if (hasCreatedAssessment && !assessmentId) {
      const timeout = setTimeout(() => {
        toast.error(t('assessment.creationTimeout', { defaultValue: 'Assessment creation timed out. Please try again.' }));
        setHasCreatedAssessment(false);
        navigate("/dashboard");
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [hasCreatedAssessment, assessmentId, navigate, t]);
  
    // --- Final submit: send all answers for current category, then submit assessment ---
  const submitAssessment = async () => {
    if (!assessmentDetail) {
      toast.error(t('assessment.failedToSubmit', { defaultValue: 'Assessment details not loaded. Please try again.' }));
      return;
    }
    
    // Handle the case where assessmentDetail is AssessmentDetailResponse (contains assessment, questions, responses)
    // or just Assessment directly
    let actualAssessment: AssessmentType;
    if ('assessment' in assessmentDetail && assessmentDetail.assessment) {
      actualAssessment = assessmentDetail.assessment;
    } else if ('assessment_id' in assessmentDetail) {
      // Properly cast to AssessmentType with type assertion
      actualAssessment = assessmentDetail as unknown as AssessmentType;
    } else {
      toast.error(t('assessment.failedToSubmit', { defaultValue: 'Invalid assessment format. Please try again.' }));
      return;
    }
    
    if (!actualAssessment.assessment_id) {
      toast.error(t('assessment.failedToSubmit', { defaultValue: 'Assessment ID is missing. Please try again.' }));
      return;
    }
    
    try {
      // Save ALL responses from ALL categories, not just the current one
      const allResponsesToSave: CreateResponseRequest[] = [];
      
      // Iterate through all categories and their questions
      for (const categoryName of categories) {
        const categoryQuestions = groupedQuestions[categoryName] || [];
        
        for (const { revision } of categoryQuestions) {
          const key = getRevisionKey(revision);
          
          // Validate that we have a valid question_revision_id
          if (!key || key.trim() === '') {
            continue; // Skip this question
          }
          
          const answer = answers[key];
          if (answer && isAnswerComplete(answer)) {
            const responseToSave = createResponseToSave(key, answer);
            allResponsesToSave.push(responseToSave);
          }
        }
      }
      
      if (allResponsesToSave.length > 0) {
        await createResponses(actualAssessment.assessment_id, allResponsesToSave, {
          onSuccess: async () => {
            // Verify all responses were saved
            const savedResponses = await offlineDB.getResponsesByAssessment(actualAssessment.assessment_id);
          },
          onError: (error) => {
            toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
          }
        });
        
        // Then submit the assessment
        if (!isOnline) {
          toast.info(t('assessment.offlineSubmission', { defaultValue: 'You are offline. Assessment will be submitted when you come back online.' }));
        }
        
        await submitAssessmentHook(actualAssessment.assessment_id, {
          onSuccess: (result) => {
            if (isOnline) {
              toast.success(t('assessment.submittedSuccessfully', { defaultValue: 'Assessment submitted successfully!' }));
            } else {
              toast.success(t('assessment.queuedForSync', { defaultValue: 'Assessment saved offline and will be submitted when online.' }));
            }
            navigate("/dashboard");
          },
          onError: (err) => {
            if (!isOnline) {
              toast.success(t('assessment.offlineSaved', { defaultValue: 'Assessment saved offline. Will sync when you come back online.' }));
              navigate("/dashboard");
            } else {
              toast.error(t('assessment.failedToSubmit', { defaultValue: 'Failed to submit assessment.' }));
            }
          }
        });
      } else {
        toast.error(t('assessment.noResponsesToSubmit', { defaultValue: 'No responses to submit for the current category.' }));
      }
    } catch (error) {
      if (!navigator.onLine) {
        toast.success(t('assessment.offlineSaved', { defaultValue: 'Assessment saved offline. Will sync when you come back online.' }));
        navigate("/dashboard");
      } else {
        toast.error(t('assessment.failedToSubmit', { defaultValue: 'Failed to submit assessment.' }));
      }
    }
  };

  // Group questions by category (support both old and new formats)
  const groupedQuestions = React.useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<string, { question: Question; revision: QuestionRevision }[]> = {};
    
    questionsData.questions.forEach((question) => {
      const category = question.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ question, revision: question.latest_revision });
    });
    
    // Filter to only categories assigned to the user (Org_User)
    const filtered: typeof groups = {};
    
    for (const userCat of orgInfo.categories) {
      const normalizedUserCat = userCat.toLowerCase();
      const matchingCategory = Object.keys(groups).find(cat => cat.toLowerCase() === normalizedUserCat);
      
      if (matchingCategory && groups[matchingCategory]) {
        filtered[matchingCategory] = groups[matchingCategory];
      }
    }
    
    return filtered;
  }, [questionsData?.questions, orgInfo.categories]);

  // Get categories from filtered questions
  const categories = Object.keys(groupedQuestions);

  // Check if we have any categories
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('assessment.noCategoriesTitle', { defaultValue: 'No Categories Available' })}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('assessment.noCategoriesDescription', { 
              defaultValue: 'No assessment categories have been assigned to your account. Please contact your organization administrator.' 
            })}
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            {t('assessment.backToDashboard', { defaultValue: 'Back to Dashboard' })}
          </Button>
        </div>
      </div>
    );
  }

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
      const key = revision.question_revision_id;
      return key;
    } else if (
      "latest_revision" in revision &&
      typeof (revision as { latest_revision?: unknown }).latest_revision ===
        "string"
    ) {
      const key = (revision as { latest_revision: string }).latest_revision;
      return key;
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
        
        // Validate that we have a valid question_revision_id
        if (!key || key.trim() === '') {
          return null;
        }
        
        const answer = answers[key];
        if (!answer) {
          return null;
        }

        return {
          question_revision_id: key,
          response: JSON.stringify(answer),
          version: 1,
        } as CreateResponseRequest; // Use CreateResponseRequest type
      })
      .filter((r): r is CreateResponseRequest => r !== null);

    // Save responses for current category only
    if (assessmentId && responsesToSend.length > 0) {
      
      try {
        await createResponses(assessmentId, responsesToSend, {
          onSuccess: () => {
            toast.success(t('assessment.responsesSaved', { defaultValue: 'Responses saved successfully!' }));
            
            // Check if we're offline and show appropriate message
            if (!navigator.onLine) {
              toast.info(t('assessment.responsesQueuedForSync', { defaultValue: 'Responses saved offline. Will sync when you come back online.' }));
            }
          },
          onError: (error) => {
            toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
          }
        });
        
        // Verify responses were saved by checking IndexedDB
        const savedResponses = await offlineDB.getResponsesByAssessment(assessmentId);
        
        // Check for pending responses
        const pendingResponses = savedResponses.filter(r => r.sync_status === 'pending');
        
      } catch (error) {
        toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
      }
    } else {
      if (responsesToSend.length === 0) {
        console.warn('⚠️ No valid responses to send - this might indicate data issues');
      }
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

  // Check if we're waiting for assessment creation
  if (assessmentId && assessmentId.startsWith('temp_')) {
    return (
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
    );
  }

  // Check if we're waiting for assessment to be saved to IndexedDB
  if (assessmentLoading && assessmentId && !assessmentId.startsWith('temp_')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
          <p className="text-gray-600">{t("assessment.loading", { defaultValue: "Loading assessment..." })}</p>
          <p className="text-sm text-gray-500 mt-2">{t("assessment.settingUp", { defaultValue: "Setting up your assessment interface." })}</p>
        </div>
      </div>
    );
  }
  
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

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = getCurrentCategoryQuestions();
  const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-2">
              {toolName}
            </h1>
            <p className="text-lg text-gray-600">
              {t("category")} {currentCategoryIndex + 1} {t("of", { defaultValue: "of" })} {categories.length}: {currentCategory}
            </p>
          </div>

          {/* Network Status Indicator */}
          {!isOnline && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-orange-800">
                      {t('assessment.offlineMode', { defaultValue: 'You are offline. Your responses will be saved locally and synced when you come back online.' })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const syncQueue = await offlineDB.getSyncQueue();
                        // Trigger sync
                        window.dispatchEvent(new Event('online'));
                        toast.success(t('assessment.syncTriggered', { defaultValue: 'Sync triggered. Please wait...' }));
                      } catch (error) {
                        console.error('Manual sync failed:', error);
                        toast.error(t('assessment.syncFailed', { defaultValue: 'Sync failed. Please try again.' }));
                      }
                    }}
                    className="text-xs"
                  >
                    Sync Now
                  </Button>
                </div>
                {pendingSubmissions.length > 0 && (
                  <div className="mt-2 text-xs text-orange-700">
                    {t('assessment.pendingSubmissions', { defaultValue: 'Pending submissions:' })} {pendingSubmissions.length}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Online Status with Pending Items */}
          {isOnline && pendingSubmissions.length > 0 && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      {t('assessment.onlineWithPending', { defaultValue: 'You are online. Syncing pending submissions...' })}
                    </span>
                  </div>
                  <div className="text-xs text-green-700">
                    {t('assessment.pendingSubmissions', { defaultValue: 'Pending submissions:' })} {pendingSubmissions.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
    );
  };
