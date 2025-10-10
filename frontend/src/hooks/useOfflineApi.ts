// Enhanced Offline API Hooks
// Provides transparent offline-first behavior using the API interceptor
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { useState, useEffect, useCallback } from "react";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  QuestionsService,
  AssessmentsService,
  ResponsesService,
  SubmissionsService,
  ReportsService,
  OrganizationsService,
  OrganizationMembersService,
  AdminService
} from "@/openapi-rq/requests/services.gen";
import type { 
  Question,
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  CreateResponseRequest,
  UpdateResponseRequest,
  AdminSubmissionDetail,
  AssessmentDetailResponse,
  QuestionRevision,
  ActionPlanListResponse,
  RecommendationWithStatus,
  OrganizationActionPlan,
  QuestionWithRevisionsResponse
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineQuestion,
  OfflineAssessment,
  OfflineResponse,
  OfflineSubmission,
  OfflineRecommendation,
  DetailedReport // Import DetailedReport
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";
import { syncService } from "../services/syncService";
import { toast } from "sonner";
import { useAuth } from "./shared/useAuth";

// Utility function to invalidate and refetch queries
export const invalidateAndRefetch = async (queryClient: QueryClient, queryKeys: string[]) => {
  try {
    // Invalidate all specified query keys
    await Promise.all(
      queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
    );
    
    // Refetch all specified query keys
    await Promise.all(
      queryKeys.map(key => queryClient.refetchQueries({ queryKey: [key] }))
    );
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
};

// ===== QUESTIONS =====

export function useOfflineQuestions() {
  const [data, setData] = useState<{ questions: QuestionWithRevisionsResponse[] }>({ questions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => QuestionsService.getQuestions(),
        async () => {
          console.log('🔍 useOfflineQuestions: Using offline fallback');
          const questions = await offlineDB.getAllQuestions();
          console.log(`🔍 useOfflineQuestions: Found ${questions.length} questions in IndexedDB`);

          // Transform OfflineQuestion to QuestionWithRevisionsResponse format
          const transformedQuestions = questions.map(q => ({
            question: {
              question_id: q.question_id,
              category_id: q.category_id, // Use category_id
              created_at: q.created_at,
              latest_revision: q.latest_revision
            },
            revisions: [q.latest_revision] // Include all revisions if available
          }));
          
          return { questions: transformedQuestions };
        },
        'questions'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch questions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineQuestionsMutation() {
  const [isPending, setIsPending] = useState(false);

  const createQuestion = useCallback(async (
    question: CreateQuestionRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a temporary object that mimics the structure of a real Question object
      const tempQuestionForTransform: Question = {
        question_id: tempId,
        category_id: question.category_id, // Use category_id
        created_at: now,
        latest_revision: {
          question_revision_id: `temp_rev_${crypto.randomUUID()}`,
          question_id: tempId,
          text: question.text,
          weight: question.weight || 5,
          created_at: now,
        },
      };

      // To transform, we need the category name. We'll fetch it from IndexedDB.
      const categoryMap = new Map<string, string>();
      const categories = await offlineDB.getAllCategoryCatalogs();
      categories.forEach(c => categoryMap.set(c.category_catalog_id, c.name));

      // Use the transformation service to create a valid OfflineQuestion
      const offlineQuestion = DataTransformationService.transformQuestion(tempQuestionForTransform, categoryMap);
      
      // Manually set a temp ID and pending status for the optimistic update
      offlineQuestion.sync_status = 'pending';
      offlineQuestion.local_changes = true;

      // Save the temporary question locally first for immediate UI feedback
      await offlineDB.saveQuestion(offlineQuestion);

      // Now, perform the actual API call
      const result = await apiInterceptor.interceptMutation(
        () => QuestionsService.postQuestions({ requestBody: question }),
        async (data: Record<string, unknown>) => {
          // This function is called by interceptMutation to save data locally
          // For create operations, we DON'T save here since we already saved above
          // The API response will be handled by updateLocalData
        },
        question as Record<string, unknown>,
        'questions',
        'create'
      );

      // Check if this is a valid API response (has question property) or request data (offline)
      if (result && typeof result === 'object' && 'question' in result) {
        // This is a valid API response - the question was created successfully
        
        // Delete the temporary question and save the real one
        await offlineDB.deleteQuestion(tempId);
        
        // The real question should be saved by updateLocalData in interceptMutation
        options?.onSuccess?.(result);
      } else {
        // This is request data (offline scenario) - still call onSuccess for immediate feedback
        options?.onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create question');
      console.error('❌ createQuestion error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const updateQuestion = useCallback(async (
    questionId: string,
    question: UpdateQuestionRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Get the existing question to update it locally
      const existingQuestion = await offlineDB.getQuestion(questionId);
      if (!existingQuestion) {
        throw new Error('Question not found in local database');
      }

      // Create updated question object
      // To update, we need the category name. We'll fetch it from IndexedDB.
      const categoryMap = new Map<string, string>();
      const categories = await offlineDB.getAllCategoryCatalogs();
      categories.forEach(c => categoryMap.set(c.category_catalog_id, c.name));
      const categoryName = categoryMap.get(question.category_id);

      const updatedQuestion: OfflineQuestion = {
        ...existingQuestion,
        category: categoryName || existingQuestion.category, // Update category name
        category_id: question.category_id, // Update category_id
        latest_revision: {
          ...existingQuestion.latest_revision,
          text: question.text,
          weight: question.weight,
          created_at: new Date().toISOString(),
        },
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      const result = await apiInterceptor.interceptMutation(
        () => QuestionsService.putQuestionsByQuestionId({ questionId, requestBody: question }),
        async (data: Record<string, unknown>) => {
          // This function is called by interceptMutation to save data locally
          // For update operations, we update the existing question
          await offlineDB.saveQuestion(updatedQuestion);
        },
        question as Record<string, unknown>,
        'questions',
        'update'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update question');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const deleteQuestion = useCallback(async (
    questionId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Get the existing question to verify it exists and get its latest revision
      const existingQuestion = await offlineDB.getQuestion(questionId);
      if (!existingQuestion) {
        throw new Error('Question not found in local database');
      }

      // Get the latest revision ID
      const latestRevisionId = existingQuestion.latest_revision?.question_revision_id;
      if (!latestRevisionId) {
        throw new Error('Question has no latest revision');
      }

      // Delete from local storage first for immediate UI feedback
      await offlineDB.deleteQuestion(questionId);

      // Now, perform the actual API call to delete the question revision
      const result = await apiInterceptor.interceptMutation(
        async () => {
          // Call the actual delete question revision API
          const { QuestionsService } = await import('@/openapi-rq/requests/services.gen');
          const response = await QuestionsService.deleteQuestionsRevisionsByQuestionRevisionId({ questionRevisionId: latestRevisionId });
          return { success: true, response };
        },
        async () => {
          // This function is called by interceptMutation to save data locally
          // For delete operations, we DON'T save anything since we already deleted above
        },
        { questionRevisionId: latestRevisionId } as Record<string, unknown>,
        'questions',
        'delete'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete question');
      console.error('❌ deleteQuestion error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createQuestion, updateQuestion, deleteQuestion, isPending };
}

// ===== ASSESSMENTS =====

export function useOfflineAssessments() {
  const [data, setData] = useState<{ assessments: Assessment[] }>({ assessments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => AssessmentsService.getAssessments(),
        async () => {
          // For offline fallback, get all assessments and filter by organization
          const allAssessments = await offlineDB.getAllAssessments();
          
          // For now, return all assessments and let the component filter them
          // This avoids the React Hook issue
          return { assessments: allAssessments };
        },
        'assessments'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch assessments'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// New hook specifically for draft assessments with backend filtering
export function useOfflineDraftAssessments() {
  const [data, setData] = useState<{ assessments: OfflineAssessment[] }>({ assessments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 useOfflineDraftAssessments: Starting fetch...');

      const result = await apiInterceptor.interceptGet(
        () => {
          console.log('🔍 useOfflineDraftAssessments: Making API call with status=draft');
          // Add cache-busting parameter to force fresh request
          const cacheBuster = Date.now();
          return AssessmentsService.getAssessments({ 
            status: 'draft',
            language: 'en' // Add language parameter to ensure fresh request
          });
        },
        async () => {
          console.log('🔍 useOfflineDraftAssessments: Using offline fallback');
          // For offline fallback, get only draft assessments using backend filtering
          const draftAssessments = await offlineDB.getAssessmentsByStatus('draft');
          console.log('🔍 useOfflineDraftAssessments: Raw assessments from IndexedDB:', draftAssessments);
          return { assessments: draftAssessments };
        },
        'assessments'
      );

      console.log('🔍 useOfflineDraftAssessments: API response received:', result);

      // Transform API response to match OfflineAssessment type and filter for draft only
      const transformedResult = {
        assessments: result.assessments
          .filter(assessment => assessment.status === 'draft') // Only include draft assessments
          .map(assessment => {
            console.log('🔍 useOfflineDraftAssessments: Processing assessment:', assessment);
            return {
              ...assessment,
              // Map the backend status to the expected offline status format
              status: (assessment.status === 'draft' ? 'draft' : 
                      assessment.status === 'submitted' ? 'submitted' : 
                      assessment.status === 'reviewed' ? 'completed' : 
                      'draft') as 'draft' | 'in_progress' | 'completed' | 'submitted',
              updated_at: new Date().toISOString(),
              sync_status: 'synced' as const,
            };
          })
      };

      console.log('🔍 useOfflineDraftAssessments: Final transformed result:', transformedResult);

      setData(transformedResult);
    } catch (err) {
      console.error('❌ useOfflineDraftAssessments: Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch draft assessments'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineAssessment(assessmentId: string) {
  const [data, setData] = useState<AssessmentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!assessmentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔍 useOfflineAssessment: Loading assessment ${assessmentId}`);
      
      const result = await apiInterceptor.interceptGet(
        () => {
          console.log(`🔍 useOfflineAssessment: Making API call for assessment ${assessmentId}`);
          return AssessmentsService.getAssessmentsByAssessmentId({ assessmentId });
        },
        async () => {
          console.log(`🔍 useOfflineAssessment: Using offline fallback for assessment ${assessmentId}`);
          
          // For offline fallback, get assessment and construct AssessmentDetailResponse
          const offlineAssessment = await offlineDB.getAssessment(assessmentId);
          console.log(`🔍 useOfflineAssessment: Retrieved from IndexedDB:`, offlineAssessment);
          
          if (!offlineAssessment) {
            console.log(`🔍 useOfflineAssessment: Assessment ${assessmentId} not found in IndexedDB`);
            
            // Check if this might be a temporary assessment that was just created
            if (assessmentId.startsWith('temp_')) {
              // Return a more user-friendly error that indicates waiting
              throw new Error('Assessment is being created, please wait...');
            }
            
            // For real assessment IDs that aren't found, provide better error message
            throw new Error(`Assessment ${assessmentId} not found. Please try refreshing the page or contact support if the problem persists.`);
          }
          
          // Get responses for this assessment
          const responses = await offlineDB.getResponsesByAssessment(assessmentId);
          console.log(`🔍 useOfflineAssessment: Found ${responses.length} responses for assessment ${assessmentId}`);
          
          // Get questions (we'll need to get all questions and filter by category)
          const allQuestions = await offlineDB.getAllQuestions();
          console.log(`🔍 useOfflineAssessment: Found ${allQuestions.length} total questions`);
          
          // Convert OfflineAssessment back to Assessment format
          const assessment: Assessment = {
            assessment_id: offlineAssessment.assessment_id,
            org_id: offlineAssessment.org_id || '',
            language: offlineAssessment.language || 'en',
            name: offlineAssessment.name || 'Untitled Assessment',
            status: offlineAssessment.status || 'draft',
            created_at: offlineAssessment.created_at || new Date().toISOString(),
            updated_at: offlineAssessment.updated_at || new Date().toISOString(),
            categories: offlineAssessment.categories || undefined,
          };
          
          // Convert OfflineResponse back to Response format
          const apiResponses: Response[] = responses.map(r => ({
            response_id: r.response_id,
            assessment_id: r.assessment_id,
            question_revision_id: r.question_revision_id,
            response: r.response,
            version: r.version,
            updated_at: r.updated_at,
          }));
          
          // For questions, we'll return empty array as we don't store question revisions separately
          const questions: QuestionRevision[] = [];
          
          const assessmentDetailResponse: AssessmentDetailResponse = {
            assessment,
            questions,
            responses: apiResponses,
          };
          
          console.log(`🔍 useOfflineAssessment: Constructed AssessmentDetailResponse:`, assessmentDetailResponse);
          return assessmentDetailResponse;
        },
        'assessments',
        assessmentId
      );

      console.log(`🔍 useOfflineAssessment: Received result:`, result);

      // Handle the case where the API returns AssessmentDetailResponse directly
      if (result && typeof result === 'object') {
        if ('assessment' in result && 'questions' in result && 'responses' in result) {
          // This is already an AssessmentDetailResponse
          console.log(`🔍 useOfflineAssessment: Setting AssessmentDetailResponse data`);
          setData(result as AssessmentDetailResponse);
        } else if ('assessment' in result) {
          // This is just an Assessment object, wrap it in AssessmentDetailResponse
          console.log(`🔍 useOfflineAssessment: Wrapping Assessment in AssessmentDetailResponse`);
          const assessment = (result as Record<string, unknown>).assessment as Assessment;
          setData({
            assessment,
            questions: [],
            responses: []
          } as AssessmentDetailResponse);
        } else {
          console.error('❌ useOfflineAssessment: Unexpected API response format:', result);
          setError(new Error('Unexpected API response format'));
        }
      } else {
        console.error('❌ useOfflineAssessment: Invalid API response:', result);
        setError(new Error('Invalid API response'));
      }
    } catch (err) {
      console.error('❌ useOfflineAssessment: Error fetching assessment:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch assessment'));
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineAssessmentsMutation() {
  const [isPending, setIsPending] = useState(false);

  const createAssessment = useCallback(async (
    assessment: CreateAssessmentRequest,
    options?: {
      onSuccess?: (data: Record<string, unknown>) => void;
      onError?: (err: Error) => void;
      organizationId?: string;
      userEmail?: string;
    }
  ) => {
    try {
      setIsPending(true);

      // Get organization context from options or use default
      const organizationId = options?.organizationId;
      const userEmail = options?.userEmail;

      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const tempAssessmentForTransform: Assessment = {
        assessment_id: tempId,
        org_id: organizationId || "temp_org",
        language: assessment.language,
        name: assessment.name,
        status: "draft",
        created_at: now,
        updated_at: now,
        categories: assessment.categories || undefined,
      };

      const offlineAssessment = DataTransformationService.transformAssessment(
        tempAssessmentForTransform,
        organizationId,
        userEmail
      );
      offlineAssessment.sync_status = 'pending';

      await offlineDB.saveAssessment(offlineAssessment);

      const result = await apiInterceptor.interceptMutation(
        () => AssessmentsService.postAssessments({ requestBody: assessment }),
        async () => {
          // The optimistic update (saving the temp assessment) is already done.
          // The real data will be saved by the interceptor's updateLocalData method.
        },
        assessment as Record<string, unknown>,
        'assessments',
        'create'
      );

      // After the API call, if successful, we clean up the temporary assessment.
      type AssessmentResponse = { assessment: Assessment };
      const isAssessmentResponse = (res: unknown): res is AssessmentResponse => {
        return (
            typeof res === 'object' &&
            res !== null &&
            'assessment' in res &&
            typeof (res as { assessment: { assessment_id: unknown } }).assessment.assessment_id === 'string'
        );
      }

      if (isAssessmentResponse(result)) {
        // This was a successful online request, the interceptor saved the real assessment.
        // Now we can safely delete the temporary one.
        await offlineDB.deleteAssessment(tempId);
      }

      // Always call onSuccess for offline-first behavior
      // The result will be the temporary assessment data when offline, or the real one when online.
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create assessment');
      console.error('❌ Assessment creation failed:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const updateAssessment = useCallback(async (
    assessmentId: string,
    assessment: UpdateAssessmentRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const result = await apiInterceptor.interceptMutation(
        () => AssessmentsService.putAssessmentsByAssessmentId({ assessmentId, requestBody: assessment }),
        async (data: Record<string, unknown>) => {
          // Check if this is a valid API response or request data
          if (!data.assessment) {
            // This is the request data, not the API response
            console.warn('Received request data instead of API response - API call may have failed');
            return;
          }
          
          const realAssessment = data.assessment as Assessment;
          if (!realAssessment || !realAssessment.assessment_id) {
            console.error('API did not return a valid assessment:', data);
            throw new Error('API did not return a valid assessment');
          }
          
          const offlineAssessment = DataTransformationService.transformAssessment(realAssessment);
          await offlineDB.saveAssessment(offlineAssessment);
        },
        assessment as Record<string, unknown>,
        'assessments',
        'update'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update assessment');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const deleteAssessment = useCallback(async (
    assessmentId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const result = await apiInterceptor.interceptMutation(
        () => AssessmentsService.deleteAssessmentsByAssessmentId({ assessmentId }).then(() => ({ success: true })),
        async () => {
          await offlineDB.deleteAssessment(assessmentId);
        },
        { assessmentId } as Record<string, unknown>,
        'assessments',
        'delete'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete assessment');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const submitDraftAssessment = useCallback(async (
    assessmentId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const tempId = `temp_draft_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a draft submission object for IndexedDB storage
      const tempDraftSubmissionForTransform: {
        draft_submission_id: string;
        assessment_id: string;
        user_id: string;
        content: { assessment: { assessment_id: string }; responses: unknown[] };
        status: string;
        submitted_at: string;
      } = {
        draft_submission_id: tempId,
        assessment_id: assessmentId,
        user_id: "current_user", // This will be replaced by the server's response
        content: { 
          assessment: { assessment_id: assessmentId },
          responses: [] // Will be populated from responses in IndexedDB
        },
        status: 'pending_approval',
        submitted_at: now,
      };

      // Always store in IndexedDB first for offline support
      try {
        // Note: We'll need to add draft submission storage to IndexedDB
        // For now, we'll store it as a regular submission with a special status
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: 'Unknown Assessment',
          review_status: 'pending_review',
        });
        await offlineDB.saveSubmission(offlineSubmission);
      } catch (storageError) {
        console.error('❌ Failed to store draft submission in IndexedDB:', storageError);
        throw new Error(`Failed to store draft submission: ${storageError}`);
      }

      // Use the draft submission endpoint
      console.log('🔍 submitDraftAssessment: Calling AssessmentsService.postAssessmentsByAssessmentIdDraft for assessmentId:', assessmentId);
      const result = await apiInterceptor.interceptMutation(
        () => AssessmentsService.postAssessmentsByAssessmentIdDraft({ assessmentId }),
        async (apiResponse: Record<string, unknown>) => {
          
          // Delete the temporary submission
          await offlineDB.deleteSubmission(tempId);
          
          if (!apiResponse.submission) {
            console.warn('Received request data instead of API response - API call may have failed');
            return;
          }
          
          const realSubmission = apiResponse.submission as Submission;
          if (!realSubmission || !realSubmission.submission_id) {
            console.error('API did not return a valid submission:', apiResponse);
            throw new Error('API did not return a valid submission');
          }
          const finalOfflineSubmission = DataTransformationService.transformSubmission(realSubmission);
          await offlineDB.saveSubmission(finalOfflineSubmission);
        },
        { assessmentId } as Record<string, unknown>,
        'draft_submission',
        'create'
      );

      // Check if we're online to determine success behavior
      const isOnline = navigator.onLine;
      
      if (result && typeof result === 'object' && 'submission' in result) {
        // Online draft submission successful
        options?.onSuccess?.(result);
      } else if (!isOnline) {
        // Offline draft submission - stored in IndexedDB, will sync later
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: 'Unknown Assessment',
          review_status: 'pending_review',
        });
        options?.onSuccess?.({ submission: offlineSubmission });
      } else {
        // Online but API failed - still stored in IndexedDB for retry
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: 'Unknown Assessment',
          review_status: 'pending_review',
        });
        options?.onSuccess?.({ submission: offlineSubmission });
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error in submitDraftAssessment:', err);
      const error = err instanceof Error ? err : new Error('Failed to submit draft assessment');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const approveAssessment = useCallback(async (
    assessmentId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      console.log('🔍 approveAssessment: Calling AssessmentsService.postAssessmentsByAssessmentIdSubmit for assessmentId:', assessmentId);
      
      // Make direct API call for approval - this should be immediate and not queued
      const result = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId });
      
      console.log('🔍 approveAssessment: API call successful:', result);
      
      // If API call succeeds, update local database
      if (result && typeof result === 'object' && 'submission' in result) {
        const submission = result.submission as Submission;
        if (submission && submission.submission_id) {
          // Update the submission status to approved in local database
          const finalOfflineSubmission = DataTransformationService.transformSubmission({
            ...submission,
            review_status: 'approved',
          });
          await offlineDB.saveSubmission(finalOfflineSubmission);
          console.log('🔍 approveAssessment: Updated local submission status to approved');
        }
      }
      
      // Always call onSuccess if the API call succeeded (no exception was thrown)
      console.log('🔍 approveAssessment: Calling onSuccess callback');
      options?.onSuccess?.(result);
      
      return result;
    } catch (err) {
      console.error('❌ Error in approveAssessment:', err);
      const error = err instanceof Error ? err : new Error('Failed to approve assessment');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createAssessment, updateAssessment, deleteAssessment, submitDraftAssessment, approveAssessment, isPending };
}

// ===== RESPONSES =====

export function useOfflineResponses(assessmentId: string) {
  const [data, setData] = useState<{ responses: Response[] }>({ responses: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!assessmentId || assessmentId.trim() === '') {
      console.warn('⚠️ Empty or invalid assessmentId provided to useOfflineResponses:', assessmentId);
      setData({ responses: [] });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching responses for assessmentId:', assessmentId);

      const result = await apiInterceptor.interceptGet(
        () => ResponsesService.getAssessmentsByAssessmentIdResponses({ assessmentId }),
        () => offlineDB.getResponsesByAssessment(assessmentId).then(responses => ({ responses })),
        'responses',
        assessmentId
      );

      setData(result);
    } catch (err) {
      console.error('❌ Error fetching responses:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch responses'));
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineResponsesMutation() {
  const [isPending, setIsPending] = useState(false);

  const createResponses = useCallback(async (
    assessmentId: string,
    responses: CreateResponseRequest[],
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Validate assessmentId
      if (!assessmentId || assessmentId.trim() === '') {
        console.error('❌ Invalid assessmentId provided to createResponses:', assessmentId);
        throw new Error('Invalid assessment ID provided');
      }

      console.log('🔍 Creating responses for assessmentId:', assessmentId);

      // Create temporary offline responses for immediate UI feedback
      const tempOfflineResponses = responses.map(response => {
        
        const offlineResponse = DataTransformationService.transformResponse(response, undefined, undefined, assessmentId);
        
        // Set sync_status to pending for offline responses
        offlineResponse.sync_status = 'pending';
        offlineResponse.local_changes = true;
        return offlineResponse;
      });
      
      // Save responses locally first
      await offlineDB.saveResponses(tempOfflineResponses);

      // Verify responses were saved
      const savedResponses = await offlineDB.getResponsesByAssessment(assessmentId);

      const result = await apiInterceptor.interceptMutation(
        () => ResponsesService.postAssessmentsByAssessmentIdResponses({ assessmentId, requestBody: responses }),
        async (data: Record<string, unknown>) => {
          const responsesData = data.responses as unknown[];
          if (responsesData && Array.isArray(responsesData)) {
            // Delete temporary responses and save the real ones from API
            for (const tempResponse of tempOfflineResponses) {
              await offlineDB.deleteResponse(tempResponse.response_id);
            }
            
            const offlineResponses = responsesData.map(r => DataTransformationService.transformResponse(r as Response));
            await offlineDB.saveResponses(offlineResponses);
          }
        },
        { assessmentId, responses } as Record<string, unknown>,
        'responses',
        'create'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      console.error('❌ Error in createResponses:', err);
      const error = err instanceof Error ? err : new Error('Failed to create responses');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const updateResponse = useCallback(async (
    assessmentId: string,
    responseId: string,
    response: UpdateResponseRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Validate parameters
      if (!assessmentId || assessmentId.trim() === '') {
        console.error('❌ Invalid assessmentId provided to updateResponse:', assessmentId);
        throw new Error('Invalid assessment ID provided');
      }
      if (!responseId || responseId.trim() === '') {
        console.error('❌ Invalid responseId provided to updateResponse:', responseId);
        throw new Error('Invalid response ID provided');
      }

      console.log('🔍 Updating response for assessmentId:', assessmentId, 'responseId:', responseId);

      const result = await apiInterceptor.interceptMutation(
        () => ResponsesService.putAssessmentsByAssessmentIdResponsesByResponseId({ assessmentId, responseId, requestBody: response }),
        async (data: Record<string, unknown>) => {
          // Ensure the response object has all required fields for IndexedDB
          const responseData = {
            response_id: responseId,
            assessment_id: assessmentId,
            question_revision_id: '', // This should come from the existing response
            response: response.response,
            version: 1,
            updated_at: new Date().toISOString(),
            ...data
          } as Response;
          
          const offlineResponse = DataTransformationService.transformResponse(responseData);
          await offlineDB.saveResponse(offlineResponse);
        },
        response as Record<string, unknown>,
        'responses',
        'update'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update response');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const deleteResponse = useCallback(async (
    assessmentId: string,
    responseId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Validate parameters
      if (!assessmentId || assessmentId.trim() === '') {
        console.error('❌ Invalid assessmentId provided to deleteResponse:', assessmentId);
        throw new Error('Invalid assessment ID provided');
      }
      if (!responseId || responseId.trim() === '') {
        console.error('❌ Invalid responseId provided to deleteResponse:', responseId);
        throw new Error('Invalid response ID provided');
      }

      console.log('🔍 Deleting response for assessmentId:', assessmentId, 'responseId:', responseId);

      const result = await apiInterceptor.interceptMutation(
        () => ResponsesService.deleteAssessmentsByAssessmentIdResponsesByResponseId({ assessmentId, responseId }).then(() => ({ success: true })),
        async () => {
          await offlineDB.deleteResponse(responseId);
        },
        { assessmentId, responseId } as Record<string, unknown>,
        'responses',
        'delete'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete response');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createResponses, updateResponse, deleteResponse, isPending };
}

// ===== SUBMISSIONS =====

export function useOfflineSubmissions() {
  const [data, setData] = useState<{ submissions: Submission[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => SubmissionsService.getSubmissions(),
        async () => {
          if (user?.organization) {
            const offlineSubmissions = await offlineDB.getSubmissionsByOrganization(user.organization);
            const transformedSubmissions: Submission[] = offlineSubmissions.map(s => ({
              submission_id: s.submission_id,
              assessment_id: s.assessment_id,
              user_id: s.user_id || 'unknown', // Ensure user_id is present
              content: {
                assessment: s.content?.assessment || { assessment_id: s.assessment_id },
                responses: s.content?.responses?.map(r => ({
                  response: r.response,
                })) || [],
              },
              review_status: s.review_status === 'pending_review' ? 'pending_review' : (s.review_status as Submission['review_status']),
              submitted_at: s.submitted_at,
              reviewed_at: s.reviewed_at,
              organization_id: s.organization_id,
              assessment_name: s.assessment_name || 'Unknown Assessment',
            }));
            return { submissions: transformedSubmissions };
          }
          return { submissions: [] };
        },
        'submissions'
      );

      setData(result as { submissions: Submission[] });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch submissions');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.organization]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const deleteSubmission = useCallback(async (submissionId: string) => {
    try {
      await offlineDB.deleteSubmission(submissionId);
      await fetchSubmissions(); // Refetch submissions after deletion
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete submission');
      setError(error);
    }
  }, [fetchSubmissions]);

  return { data, isLoading, error, refetch: fetchSubmissions, deleteSubmission };
}

export function useOfflineSubmissionsMutation() {
  const [isPending, setIsPending] = useState(false);

  const deleteSubmission = useCallback(async (
    submissionId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Check if submission exists before attempting to delete
      const existingSubmission = await offlineDB.getSubmission(submissionId);
      if (!existingSubmission) {
        const error = new Error('Submission not found');
        options?.onError?.(error);
        throw error;
      }

      // Try to delete from the API first
      const result = await apiInterceptor.interceptMutation(
        async () => {
          console.log('🔍 deleteSubmission: Making API call to delete submission', submissionId);
          await SubmissionsService.deleteSubmissionsBySubmissionId({ submissionId });
          return { success: true, message: 'Submission deleted from server' };
        },
        async (data: Record<string, unknown>) => {
          console.log('🔍 deleteSubmission: Using offline fallback - deleting from local storage only');
          // For offline fallback, just delete from local storage
          await offlineDB.deleteSubmission(submissionId);
        },
        { submissionId },
        'submissions',
        'delete'
      );

      // If API call was successful, also delete from local storage
      if (result) {
        await offlineDB.deleteSubmission(submissionId);
      }

      const successResult = { 
        success: true, 
        message: 'Submission deleted successfully',
        submissionId 
      };
      
      options?.onSuccess?.(successResult);
      return successResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete submission');
      console.error('❌ deleteSubmission error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { deleteSubmission, isPending };
}

// ===== ADMIN SUBMISSIONS =====

export function useOfflineAdminSubmissions() {
  const [data, setData] = useState<{ submissions: AdminSubmissionDetail[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => {
          return AdminService.getAdminSubmissions({});
        },
        async () => {
          // For offline fallback, get all submissions and transform them to AdminSubmissionDetail format
          const allSubmissions = await offlineDB.getAllSubmissions();
          
          // Transform OfflineSubmission to AdminSubmissionDetail format
          const adminSubmissions: AdminSubmissionDetail[] = allSubmissions.map(submission => ({
            submission_id: submission.submission_id,
            assessment_id: submission.assessment_id,
            user_id: submission.user_id || 'unknown',
            org_id: submission.organization_id || 'unknown',
            org_name: submission.org_name || 'Offline Data - Organization Name Unavailable', // Use stored org_name
            content: {
              assessment: submission.content?.assessment || { assessment_id: submission.assessment_id },
              responses: submission.content?.responses?.map(r => ({
                response: r.response,
              })) || []
            },
            review_status: submission.review_status,
            submitted_at: submission.submitted_at,
            reviewed_at: submission.reviewed_at
          }));
          
          return { submissions: adminSubmissions };
        },
        'admin_submissions'
      );

      setData(result);
    } catch (err) {
      console.error('❌ useOfflineAdminSubmissions: Error fetching admin submissions:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch admin submissions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ===== REPORTS =====

export function useOfflineAdminActionPlans() {
  const [data, setData] = useState<ActionPlanListResponse>({ organizations: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => AdminService.getAdminActionPlans(),
        async () => {
          // Offline fallback: fetch all recommendations from IndexedDB
          const offlineRecommendations = await offlineDB.getAllRecommendations();

          // Group recommendations by organization to match ActionPlanListResponse structure
          const organizationsMap = new Map<string, OrganizationActionPlan>();

          offlineRecommendations.forEach(rec => {
            if (!organizationsMap.has(rec.organization_id)) {
              organizationsMap.set(rec.organization_id, {
                organization_id: rec.organization_id,
                organization_name: rec.organization_name,
                recommendations: [],
              });
            }
            organizationsMap.get(rec.organization_id)?.recommendations.push({
              recommendation_id: rec.recommendation_id,
              report_id: rec.report_id,
              category: rec.category,
              recommendation: rec.recommendation,
              status: rec.status,
              created_at: rec.created_at,
            });
          });

          return { organizations: Array.from(organizationsMap.values()) };
        },
        'admin_action_plans'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch admin action plans'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineReports() {
  const [data, setData] = useState<{ recommendations: OfflineRecommendation[]; reports: Report[] }>({ recommendations: [], reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth(); // Get current user for organization_id context

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          const reports = await ReportsService.getUserReports();
          // Transform reports into offline recommendations and save them
          const allOfflineRecommendations: OfflineRecommendation[] = [];
          for (const report of reports.reports) {
            const transformedRecs = DataTransformationService.transformReportToOfflineRecommendations(
              report as unknown as DetailedReport,
              user?.organization, // Access organization_id correctly
              user?.organization_name // Access organization_name correctly
            );
            allOfflineRecommendations.push(...transformedRecs);
          }
          await offlineDB.saveRecommendations(allOfflineRecommendations);
          return { recommendations: allOfflineRecommendations, reports: reports.reports }; // Return the transformed data and raw reports
        },
        async () => {
          // Offline fallback: fetch all recommendations from IndexedDB
          const offlineRecommendations = await offlineDB.getAllRecommendations();
          // Filter by user's organization_id if available, otherwise return all
          return {
            recommendations: user?.organization
              ? offlineRecommendations.filter(rec => rec.organization_id === user.organization)
              : offlineRecommendations,
            reports: [], // No raw reports available offline
          };
        },
        'user_recommendations'
      );

      setData(result as { recommendations: OfflineRecommendation[], reports: Report[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Re-run if user changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineUserRecommendations() {
  const [data, setData] = useState<{ reports: DetailedReport[] }>({ reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          const reportsResponse = await ReportsService.getUserReports();
          const reports = (reportsResponse.reports || []) as unknown as DetailedReport[];

          const allOfflineRecommendations: OfflineRecommendation[] = [];
          for (const report of reports) {
            const transformedRecs = DataTransformationService.transformReportToOfflineRecommendations(
              report,
              user?.organization,
              user?.organization_name
            );
            allOfflineRecommendations.push(...transformedRecs);
          }
          await offlineDB.saveRecommendations(allOfflineRecommendations);
          
          return { reports };
        },
        async () => {
          const offlineRecommendations = await offlineDB.getAllRecommendations();
          const userRecommendations = user?.organization
            ? offlineRecommendations.filter(rec => rec.organization_id === user.organization)
            : offlineRecommendations;

          const reportsMap = new Map<string, DetailedReport>();

          for (const rec of userRecommendations) {
            if (!reportsMap.has(rec.report_id)) {
              reportsMap.set(rec.report_id, {
                report_id: rec.report_id,
                submission_id: '',
                report_type: 'sustainability',
                status: 'completed',
                generated_at: new Date().toISOString(),
                data: [],
              });
            }
        
            const report = reportsMap.get(rec.report_id)!;
            
            let categoryObj = report.data.find(d => d[rec.category]);
            if (!categoryObj) {
              categoryObj = { [rec.category]: { recommendations: [] } };
              report.data.push(categoryObj);
            }
        
            const categoryContent = categoryObj[rec.category];
            if (categoryContent && categoryContent.recommendations) {
              categoryContent.recommendations.push({
                id: rec.recommendation_id,
                status: rec.status as "todo" | "in_progress" | "done" | "approved",
                text: rec.recommendation,
              });
            }
          }
          
          const reconstructedReports = Array.from(reportsMap.values());
          return { reports: reconstructedReports };
        },
        'user_recommendations'
      );
      setData(result as { reports: DetailedReport[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}


export function useOfflineRecommendationStatusMutation() {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const updateRecommendationStatus = useCallback(async (
    reportId: string,
    category: string,
    recommendationId: string,
    newStatus: "todo" | "in_progress" | "done" | "approved", // Use literal union type
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Optimistically update the local state first
      await offlineDB.updateRecommendationStatus(reportId, category, recommendationId, newStatus);
      
      // Invalidate relevant queries for immediate UI feedback
      await invalidateAndRefetch(queryClient, ['user_recommendations', 'admin_action_plans']);

      const result = await apiInterceptor.interceptMutation(
        () => ReportsService.putReportsByReportIdRecommendationsByRecommendationIdStatus({
          reportId: reportId,
          recommendationId: recommendationId,
          requestBody: {
            report_id: reportId,
            category: category,
            recommendation_id: recommendationId,
            status: newStatus,
          },
        }) as Promise<Record<string, unknown>>, // Cast to Promise<Record<string, unknown>>
        async (apiResponse: Record<string, unknown>) => {
          // If the API call succeeds, the status should already be updated in localDB by the optimistic update.
          // However, we should ensure the sync_status is set to 'synced' if not already.
          const updatedRecommendation = await offlineDB.getRecommendation(recommendationId);
          if (updatedRecommendation && updatedRecommendation.sync_status === 'pending') {
            await offlineDB.saveRecommendation({ ...updatedRecommendation, sync_status: 'synced' });
          }
        },
        { recommendation_id: recommendationId, report_id: reportId, category, status: newStatus } as Record<string, unknown>,
        'recommendations',
        'update'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update recommendation status');
      console.error('❌ updateRecommendationStatus error:', error);
      
      // Revert optimistic update on error if possible and desired
      const originalRecommendation = await offlineDB.getRecommendation(recommendationId);
      if (originalRecommendation) {
        // Here you might want to revert to the previous status or mark as 'failed'
        // For simplicity, we'll mark as failed. A robust solution might store original status.
        await offlineDB.saveRecommendation({ ...originalRecommendation, sync_status: 'failed' });
      }

      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [queryClient]);

  return { updateRecommendationStatus, isPending };
}

// ===== ORGANIZATIONS =====

export function useOfflineOrganizations() {
  const [data, setData] = useState<{ organizations: Organization[] }>({ organizations: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => OrganizationsService.getAdminOrganizations().then(response => ({ organizations: response })),
        () => offlineDB.getAllOrganizations().then(organizations => ({ organizations })),
        'organizations'
      );

      setData(result as { organizations: Organization[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch organizations'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ===== USERS =====

export function useOfflineUsers(organizationId?: string) {
  const [data, setData] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the org-admin specific endpoint for fetching users
      const result = await apiInterceptor.interceptGet(
        () => OrganizationMembersService.getOrganizationsByIdOrgAdminMembers({ id: organizationId }).then(response => ({ members: response })),
        () => offlineDB.getUsersByOrganization(organizationId).then(users => ({ members: users })),
        'users',
        organizationId
      );

      // Filter out temporary users (those with IDs starting with "temp_")
      const resultData = result as { members: OrganizationMember[] } | OrganizationMember[];
      const filteredResult = Array.isArray(resultData) ? resultData : resultData.members || [];
      const filteredUsers = filteredResult.filter((user: OrganizationMember) => !user.id?.startsWith('temp_'));
      
      setData(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ===== DRAFT SUBMISSIONS =====

export function useOfflineDraftSubmissions() {
  const [data, setData] = useState<{ draft_submissions: unknown[] }>({ draft_submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

              // Use the admin draft submissions endpoint
      console.log('🔍 useOfflineDraftSubmissions: Starting fetch...');
      console.log('🔍 useOfflineDraftSubmissions: Calling AdminService.getDrafts()');
      const result = await apiInterceptor.interceptGet(
        () => {
          console.log('🔍 useOfflineDraftSubmissions: Inside AdminService.getDrafts() call');
          console.log('🔍 useOfflineDraftSubmissions: Timestamp:', new Date().toISOString());
          // Add cache-busting parameter to ensure fresh data
          return AdminService.getDrafts({ status: undefined });
        },
        () => {
          console.log('🔍 useOfflineDraftSubmissions: Using offline fallback');
          return offlineDB.getAllSubmissions().then(submissions => ({ 
            draft_submissions: submissions.filter(s => s.review_status === 'pending_review') 
          }));
        },
        'drafts_endpoint',
      );
      console.log('🔍 useOfflineDraftSubmissions: Result received:', result);

      setData(result as { draft_submissions: unknown[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch draft submissions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ===== UTILITY HOOKS =====

export function useOfflineSyncStatus() {
  const [isOnline, setIsOnline] = useState(apiInterceptor.getNetworkStatus());
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(apiInterceptor.getNetworkStatus());
    };

    const updateQueueCount = async () => {
      const queue = await offlineDB.getSyncQueue();
      setQueueCount(queue.length);
    };

    const updateSyncStatus = () => {
      setIsSyncing(syncService.isCurrentlySyncing());
    };

    // Update immediately
    updateStatus();
    updateQueueCount();
    updateSyncStatus();

    // Set up listeners
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Update queue count and sync status periodically
    const interval = setInterval(() => {
      updateQueueCount();
      updateSyncStatus();
    }, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, queueCount, isSyncing };
}

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    try {
      setIsSyncing(true);
      // Perform both queue processing and full sync
      await apiInterceptor.processQueue();
      await syncService.performFullSync();
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { sync, isSyncing };
} 