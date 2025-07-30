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
import { Info, Paperclip, ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
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

  console.log('🔍 Assessment component loaded with assessmentId:', assessmentId);

  // Network status from hook
  const { isOnline } = useOfflineSyncStatus();

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmissions = async () => {
      try {
        const submissions = await offlineDB.getAllSubmissions();
        const pending = submissions.filter(sub => sub.sync_status === 'pending');
        setPendingSubmissions(pending);
        console.log('🔍 Pending submissions:', pending);
        
        // Debug: Check sync queue
        const syncQueue = await offlineDB.getSyncQueue();
        console.log('🔍 Sync queue:', syncQueue);
        
        // Debug: Check all submissions
        console.log('🔍 All submissions in IndexedDB:', submissions);
        
        // Debug: Check all responses
        const allResponses = await offlineDB.getResponsesWithFilters({});
        const pendingResponses = allResponses.filter(r => r.sync_status === 'pending');
        console.log('🔍 All responses in IndexedDB:', allResponses);
        console.log('🔍 Pending responses:', pendingResponses);
      } catch (error) {
        console.error('Failed to check pending submissions:', error);
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
    
    // Debug logging
    console.log('🔍 Assessment - Full user object:', user);
    console.log('🔍 Assessment - User organizations:', user.organizations);
    console.log('🔍 Assessment - User personal categories:', userCategories);
    console.log('🔍 Assessment - Organization ID:', orgId);
    console.log('🔍 Assessment - User roles:', user.roles);
    console.log('🔍 Assessment - User realm_access roles:', user.realm_access?.roles);
    
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
            console.log('🔍 Assessment creation success result:', result);
            // The result should contain the API response with the real assessment ID
            if (result && typeof result === 'object' && 'assessment' in result) {
              const apiResponse = result as { assessment: AssessmentType };
              console.log('🔍 API response assessment:', apiResponse.assessment);
              if (apiResponse.assessment && apiResponse.assessment.assessment_id) {
                const realAssessmentId = apiResponse.assessment.assessment_id;
                console.log('🔍 Assessment created with ID:', realAssessmentId);
                
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
                        console.log('🔍 Assessment found in IndexedDB, navigating...');
                        navigate(`/user/assessment/${realAssessmentId}`);
                        return;
                      }
                      
                      console.log(`🔍 Assessment not found in IndexedDB yet, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
                      await new Promise(resolve => setTimeout(resolve, 500));
                      attempts++;
                    }
                    
                    console.warn('🔍 Assessment not found in IndexedDB after maximum attempts, navigating anyway...');
                    navigate(`/user/assessment/${realAssessmentId}`);
                  };
                  
                  waitForAssessment();
                } else {
                  console.warn('Received temporary assessment ID, waiting for real ID');
                  // Don't navigate yet, wait for the real assessment ID
                  // The mutation will retry and eventually provide the real ID
                  setHasCreatedAssessment(false); // Allow retry
                }
              } else {
                console.error('API response missing assessment ID:', result);
                toast.error(t('assessment.failedToCreate'));
                setHasCreatedAssessment(false);
              }
            } else {
              console.error('Unexpected API response format:', result);
              toast.error(t('assessment.failedToCreate'));
              setHasCreatedAssessment(false);
            }
          },
          onError: (err) => {
            console.error('❌ Assessment creation error:', err);
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
        console.warn('Assessment creation timeout - redirecting to dashboard');
        toast.error(t('assessment.creationTimeout', { defaultValue: 'Assessment creation timed out. Please try again.' }));
        setHasCreatedAssessment(false);
        navigate("/dashboard");
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [hasCreatedAssessment, assessmentId, navigate, t]);
  
    // --- Final submit: send all answers for current category, then submit assessment ---
  const submitAssessment = async () => {
    console.log('🔍 submitAssessment called');
    console.log('🔍 assessmentId from params:', assessmentId);
    console.log('🔍 assessmentDetail:', assessmentDetail);
    console.log('🔍 assessmentLoading:', assessmentLoading);
    
    if (!assessmentDetail) {
      console.error('❌ assessmentDetail is null or undefined');
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
      console.error('❌ Invalid assessment detail format:', assessmentDetail);
      toast.error(t('assessment.failedToSubmit', { defaultValue: 'Invalid assessment format. Please try again.' }));
      return;
    }
    
    if (!actualAssessment.assessment_id) {
      console.error('❌ assessment.assessment_id is missing:', actualAssessment);
      toast.error(t('assessment.failedToSubmit', { defaultValue: 'Assessment ID is missing. Please try again.' }));
      return;
    }
    
    try {
      // Save ALL responses from ALL categories, not just the current one
      console.log('🔍 Saving all responses from all categories...');
      const allResponsesToSave: CreateResponseRequest[] = [];
      
      // Iterate through all categories and their questions
      for (const categoryName of categories) {
        const categoryQuestions = groupedQuestions[categoryName] || [];
        console.log(`🔍 Processing category "${categoryName}" with ${categoryQuestions.length} questions`);
        
        for (const { revision } of categoryQuestions) {
          const key = getRevisionKey(revision);
          
          // Validate that we have a valid question_revision_id
          if (!key || key.trim() === '') {
            console.error('❌ Invalid question_revision_id for question revision:', revision);
            continue; // Skip this question
          }
          
          const answer = answers[key];
          if (answer && isAnswerComplete(answer)) {
            const responseToSave = createResponseToSave(key, answer);
            allResponsesToSave.push(responseToSave);
            console.log(`🔍 Added response for question ${key}:`, responseToSave);
          } else {
            console.log(`🔍 Skipping incomplete answer for question ${key}:`, answer);
          }
        }
      }
      
      console.log(`🔍 Total responses to save: ${allResponsesToSave.length}`);
      
      if (allResponsesToSave.length > 0) {
        console.log('🔍 Saving all responses to IndexedDB...');
        await createResponses(actualAssessment.assessment_id, allResponsesToSave, {
          onSuccess: () => {
            console.log('✅ All responses saved successfully to IndexedDB');
          },
          onError: (error) => {
            console.error('❌ Failed to save responses:', error);
            toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
          }
        });
        
        // Verify all responses were saved
        const savedResponses = await offlineDB.getResponsesByAssessment(actualAssessment.assessment_id);
        console.log('🔍 All responses in IndexedDB after save:', savedResponses);
      } else {
        console.log('🔍 No responses to save');
      }
      
      // Then submit the assessment
      console.log('🔍 Submitting assessment with ID:', actualAssessment.assessment_id);
      
      // Check if we're online
      const isOnline = navigator.onLine;
      console.log('🔍 Network status:', isOnline ? 'Online' : 'Offline');
      
      if (!isOnline) {
        toast.info(t('assessment.offlineSubmission', { defaultValue: 'You are offline. Assessment will be submitted when you come back online.' }));
      }
      
      // Debug: Check what's in IndexedDB before submission
      const allSubmissionsBefore = await offlineDB.getAllSubmissions();
      console.log('📊 All submissions in IndexedDB BEFORE submission:', allSubmissionsBefore);
      
      // Test IndexedDB functionality
      try {
        const testSubmission = {
          submission_id: 'test_submission',
          assessment_id: 'test_assessment',
          user_id: 'test_user',
          content: { assessment: { assessment_id: 'test_assessment' }, responses: [] },
          review_status: 'under_review' as const,
          submitted_at: new Date().toISOString(),
          organization_id: 'test_org',
          reviewer_id: undefined,
          reviewer_email: undefined,
          review_comments: '',
          files: [],
          updated_at: new Date().toISOString(),
          sync_status: 'pending' as const,
          local_changes: true,
          last_synced: undefined
        };
        
        await offlineDB.saveSubmission(testSubmission);
        console.log('✅ Test submission saved successfully');
        await offlineDB.deleteSubmission('test_submission');
        console.log('✅ Test submission deleted successfully');
      } catch (testError) {
        console.error('❌ IndexedDB test failed:', testError);
      }
      
      await submitAssessmentHook(actualAssessment.assessment_id, {
        onSuccess: (result) => {
          console.log('🔍 Submission success result:', result);
          
          // Debug: Check what's in IndexedDB after submission
          const checkSubmissions = async () => {
            const allSubmissionsAfter = await offlineDB.getAllSubmissions();
            console.log('📊 All submissions in IndexedDB AFTER submission:', allSubmissionsAfter);
            
            // Check for pending submissions
            const pendingSubmissions = allSubmissionsAfter.filter(s => s.sync_status === 'pending');
            console.log('📊 Pending submissions:', pendingSubmissions);
          };
          
          checkSubmissions();
          
          if (isOnline) {
            toast.success(t('assessment.submittedSuccessfully', { defaultValue: 'Assessment submitted successfully!' }));
          } else {
            toast.success(t('assessment.queuedForSync', { defaultValue: 'Assessment saved offline and will be submitted when online.' }));
          }
          console.log('🔍 Redirecting to dashboard after submission');
          navigate("/dashboard");
        },
        onError: (err) => {
          console.log('🔍 Submission error:', err);
          
          // Debug: Check what's in IndexedDB after error
          const checkSubmissions = async () => {
            const allSubmissionsAfter = await offlineDB.getAllSubmissions();
            console.log('📊 All submissions in IndexedDB AFTER error:', allSubmissionsAfter);
          };
          
          checkSubmissions();
          
          if (!isOnline) {
            toast.success(t('assessment.offlineSaved', { defaultValue: 'Assessment saved offline. Will sync when you come back online.' }));
            console.log('🔍 Redirecting to dashboard after offline error');
            navigate("/dashboard");
          } else {
            toast.error(t('assessment.failedToSubmit', { defaultValue: 'Failed to submit assessment.' }));
            console.error(err);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in submitAssessment:', error);
      if (!navigator.onLine) {
        toast.success(t('assessment.offlineSaved', { defaultValue: 'Assessment saved offline. Will sync when you come back online.' }));
        navigate("/dashboard");
      } else {
        toast.error(t('assessment.failedToSubmit', { defaultValue: 'Failed to submit assessment.' }));
        console.error('Submit assessment error:', error);
      }
    }
  };

  // Group questions by category (support both old and new formats)
  const groupedQuestions = React.useMemo(() => {
    console.log('🔍 Assessment - Questions data:', questionsData);
    console.log('🔍 Assessment - Org info categories:', orgInfo.categories);
    console.log('🔍 Assessment - User categories for filtering:', orgInfo.categories);
    
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
    
    console.log('🔍 Assessment - All available categories in questions:', Object.keys(groups));
    console.log('🔍 Assessment - All grouped questions:', groups);
    
    // Filter to only categories assigned to the user (Org_User)
    const filtered: typeof groups = {};
    console.log('🔍 Assessment - Starting filtering process...');
    console.log('🔍 Assessment - User categories to filter by:', orgInfo.categories);
    
    // Create a case-insensitive map of available categories
    const availableCategoriesMap = new Map<string, string>();
    Object.keys(groups).forEach(cat => {
      availableCategoriesMap.set(cat.toLowerCase(), cat);
    });
    
    for (const userCat of orgInfo.categories) {
      console.log(`🔍 Assessment - Checking if category "${userCat}" exists in questions...`);
      const normalizedUserCat = userCat.toLowerCase();
      const matchingCategory = availableCategoriesMap.get(normalizedUserCat);
      
      if (matchingCategory && groups[matchingCategory]) {
        console.log(`🔍 Assessment - Category "${userCat}" found as "${matchingCategory}", adding to filtered questions`);
        filtered[matchingCategory] = groups[matchingCategory];
      } else {
        console.log(`🔍 Assessment - Category "${userCat}" NOT found in questions`);
        console.log(`🔍 Assessment - Available categories:`, Object.keys(groups));
        console.log(`🔍 Assessment - Normalized user category: "${normalizedUserCat}"`);
      }
    }
    
    console.log('🔍 Assessment - Filtered questions for user categories:', filtered);
    console.log('🔍 Assessment - Available categories after filtering:', Object.keys(filtered));
    
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
    console.log('🔍 getRevisionKey called with revision:', revision);
    
    if (hasQuestionRevisionId(revision)) {
      const key = revision.question_revision_id;
      console.log('🔍 Found question_revision_id:', key);
      return key;
    } else if (
      "latest_revision" in revision &&
      typeof (revision as { latest_revision?: unknown }).latest_revision ===
        "string"
    ) {
      const key = (revision as { latest_revision: string }).latest_revision;
      console.log('🔍 Found latest_revision:', key);
      return key;
    }
    
    console.error('❌ No valid revision key found in:', revision);
    console.error('❌ Revision keys available:', Object.keys(revision));
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
          console.error('❌ Invalid question_revision_id for question:', question);
          console.error('❌ Question revision:', question.revision);
          return null;
        }
        
        const answer = answers[key];
        if (!answer) {
          console.warn('⚠️ No answer found for question with key:', key);
          return null;
        }

        console.log('🔍 Creating response for question_revision_id:', key);
        
        return {
          question_revision_id: key,
          response: JSON.stringify(answer),
          version: 1,
        } as CreateResponseRequest; // Use CreateResponseRequest type
      })
      .filter((r): r is CreateResponseRequest => r !== null);

    console.log('🔍 nextCategory - Responses to send for current category:', responsesToSend);
    console.log('🔍 nextCategory - Assessment ID:', assessmentId);
    console.log('🔍 nextCategory - Current category:', categories[currentCategoryIndex]);

    // Save responses for current category only
    if (assessmentId && responsesToSend.length > 0) {
      console.log('🔍 nextCategory - Saving responses for current category to IndexedDB...');
      
      try {
        await createResponses(assessmentId, responsesToSend, {
          onSuccess: () => {
            console.log('✅ Responses for current category saved successfully to IndexedDB');
            toast.success(t('assessment.responsesSaved', { defaultValue: 'Responses saved successfully!' }));
            
            // Check if we're offline and show appropriate message
            if (!navigator.onLine) {
              toast.info(t('assessment.responsesQueuedForSync', { defaultValue: 'Responses saved offline. Will sync when you come back online.' }));
            }
          },
          onError: (error) => {
            console.error('❌ Failed to save responses:', error);
            toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
          }
        });
        
        // Verify responses were saved by checking IndexedDB
        const savedResponses = await offlineDB.getResponsesByAssessment(assessmentId);
        console.log('🔍 nextCategory - All responses in IndexedDB after save:', savedResponses);
        
        // Check for pending responses
        const pendingResponses = savedResponses.filter(r => r.sync_status === 'pending');
        if (pendingResponses.length > 0) {
          console.log('🔍 nextCategory - Found pending responses:', pendingResponses.length);
        }
        
      } catch (error) {
        console.error('❌ Error in nextCategory:', error);
        toast.error(t('assessment.failedToSaveResponses', { defaultValue: 'Failed to save responses. Please try again.' }));
      }
    } else {
      console.log('🔍 nextCategory - No responses to save or no assessment ID');
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

  if (categories.length === 0) {
    console.log('🔍 Assessment - NO CATEGORIES FOUND!');
    console.log('🔍 Assessment - Questions data available:', !!questionsData);
    console.log('🔍 Assessment - Questions count:', questionsData?.questions?.length || 0);
    console.log('🔍 Assessment - User categories from ID token:', user?.categories);
    console.log('🔍 Assessment - Org info categories:', orgInfo.categories);
    
    // Let's see what categories are actually available in the questions
    if (questionsData?.questions) {
      const availableCategories = new Set<string>();
      const allQuestions = [];
      (questionsData.questions as unknown[]).forEach((q, index) => {
        let category: string | undefined;
        let questionText = '';
        
        if (typeof q === 'object' && q !== null && 'category' in q) {
          category = (q as { category: string }).category;
          questionText = (q as { latest_revision?: { text?: { en?: string } } }).latest_revision?.text?.en || 'No text';
        } else if (typeof q === 'object' && q !== null && 'question' in q) {
          category = (q as { question: { category: string } }).question.category;
          questionText = (q as { question?: { latest_revision?: { text?: { en?: string } } } }).question?.latest_revision?.text?.en || 'No text';
        }
        
        if (category) {
          availableCategories.add(category);
          allQuestions.push({ index, category, questionText: questionText.substring(0, 50) + '...' });
        }
      });
      console.log('🔍 Assessment - Available categories in questions:', Array.from(availableCategories));
      console.log('🔍 Assessment - All questions with categories:', allQuestions);
    }
    
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
                <div className="text-sm text-gray-500 mb-4 text-left">
                  <p><strong>Debug Info:</strong></p>
                  <p>User Categories: {user?.categories?.join(', ') || 'None'}</p>
                  <p>Questions Available: {questionsData?.questions?.length || 0}</p>
                  <p>User Roles: {user?.roles?.join(', ') || 'None'}</p>
                  <p>Is Org User: {user?.roles?.includes('Org_User') ? 'Yes' : 'No'}</p>
                  {questionsData?.questions && (
                    <div className="mt-4">
                      <p><strong>Available Categories in Questions:</strong></p>
                      <ul className="list-disc pl-4">
                        {Array.from(new Set((questionsData.questions as unknown[]).map((q: unknown) => {
                          if (typeof q === 'object' && q !== null && 'category' in q) {
                            return (q as { category: string }).category;
                          } else if (typeof q === 'object' && q !== null && 'question' in q) {
                            return (q as { question: { category: string } }).question.category;
                          }
                          return null;
                        }).filter(Boolean))).map((cat, i) => (
                          <li key={i}>{cat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
                        console.log('Manual sync - Queue items:', syncQueue);
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
