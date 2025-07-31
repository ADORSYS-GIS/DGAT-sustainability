// Enhanced Offline API Hooks
// Provides transparent offline-first behavior using the API interceptor
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { useState, useEffect, useCallback } from "react";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  QuestionsService,
  CategoriesService,
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
  Category, 
  Assessment, 
  Response, 
  Submission,
  Report,
  Organization,
  OrganizationMember,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  CreateResponseRequest,
  UpdateResponseRequest,
  AdminSubmissionDetail,
  AssessmentDetailResponse,
  QuestionRevision
} from "@/openapi-rq/requests/types.gen";
import type { 
  OfflineQuestion, 
  OfflineCategory, 
  OfflineAssessment, 
  OfflineResponse, 
  OfflineSubmission 
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";
import { syncService } from "../services/syncService";
import { toast } from "sonner";

// Utility function to invalidate and refetch queries
const invalidateAndRefetch = async (queryClient: QueryClient, queryKeys: string[]) => {
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
  const [data, setData] = useState<{ questions: Question[] }>({ questions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => QuestionsService.getQuestions(),
        () => offlineDB.getAllQuestions().then(qs => ({ questions: qs })),
        'questions'
      );

      setData(result as { questions: Question[] });
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
        category: question.category,
        created_at: now,
        latest_revision: {
          question_revision_id: `temp_rev_${crypto.randomUUID()}`,
          question_id: tempId,
          text: question.text,
          weight: question.weight || 5,
          created_at: now,
        },
      };

      // Use the transformation service to create a valid OfflineQuestion
      const offlineQuestion = DataTransformationService.transformQuestion(tempQuestionForTransform);
      
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
      const updatedQuestion: OfflineQuestion = {
        ...existingQuestion,
        category: question.category,
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

// ===== CATEGORIES =====

export function useOfflineCategories() {
  const [data, setData] = useState<{ categories: Category[] }>({ categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => CategoriesService.getCategories(),
        () => offlineDB.getAllCategories().then(cats => ({ categories: cats })),
        'categories'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineCategoriesMutation() {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const createCategory = useCallback(async (
    category: CreateCategoryRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const tempCategoryForTransform: Category = {
        category_id: tempId,
        name: category.name,
        weight: category.weight,
        order: category.order,
        template_id: category.template_id,
        created_at: now,
        updated_at: now,
      };

      const offlineCategory = DataTransformationService.transformCategory(tempCategoryForTransform);
      offlineCategory.sync_status = 'pending';
      offlineCategory.local_changes = true;

      // Save the temporary category locally first for immediate UI feedback
      await offlineDB.saveCategory(offlineCategory);

      const result = await apiInterceptor.interceptMutation(
        () => CategoriesService.postCategories({ requestBody: category }),
        async (data: Record<string, unknown>) => {
          // This function is called by interceptMutation to save data locally
          // For create operations, we DON'T save here since we already saved above
          // The API response will be handled by updateLocalData
        },
        category as Record<string, unknown>,
        'categories',
        'create'
      );

      // Check if this is a valid API response (has category property) or request data (offline)
      if (result && typeof result === 'object' && 'category' in result) {
        // This is a valid API response - the category was created successfully
        
        // Delete the temporary category and save the real one
        await offlineDB.deleteCategory(tempId);
        
        // The real category should be saved by updateLocalData in interceptMutation
        options?.onSuccess?.(result);
      } else {
        // This is request data (offline scenario) - still call onSuccess for immediate feedback
        options?.onSuccess?.(result);
      }

      // Invalidate and refetch categories data to update UI
      await invalidateAndRefetch(queryClient, ["categories"]);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create category');
      console.error('❌ createCategory error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const updateCategory = useCallback(async (
    categoryId: string,
    category: UpdateCategoryRequest,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const now = new Date().toISOString();

      const tempCategoryForTransform: Category = {
        category_id: categoryId,
        name: category.name,
        weight: category.weight,
        order: category.order,
        template_id: '', // Default template_id since it's not in UpdateCategoryRequest
        created_at: now,
        updated_at: now,
      };

      const offlineCategory = DataTransformationService.transformCategory(tempCategoryForTransform);
      offlineCategory.sync_status = 'pending';
      offlineCategory.local_changes = true;

      // Update the category locally first for immediate UI feedback
      await offlineDB.saveCategory(offlineCategory);

      const result = await apiInterceptor.interceptMutation(
        () => CategoriesService.putCategoriesByCategoryId({ categoryId, requestBody: category }),
        async (data: Record<string, unknown>) => {
          // This function is called by interceptMutation to save data locally
          // For update operations, we DON'T save here since we already saved above
          // The API response will be handled by updateLocalData
        },
        category as Record<string, unknown>,
        'categories',
        'update'
      );

      // Check if this is a valid API response or request data (offline)
      if (result && typeof result === 'object' && 'category' in result) {
        // This is a valid API response - the category was updated successfully
        options?.onSuccess?.(result);
      } else {
        // This is request data (offline scenario) - still call onSuccess for immediate feedback
        options?.onSuccess?.(result);
      }

      // Invalidate and refetch categories data to update UI
      await invalidateAndRefetch(queryClient, ["categories"]);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update category');
      console.error('❌ updateCategory error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const deleteCategory = useCallback(async (
    categoryId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const result = await apiInterceptor.interceptMutation(
        () => CategoriesService.deleteCategoriesByCategoryId({ categoryId }).then(() => ({ success: true })),
        async (data: Record<string, unknown>) => {
          // Delete the category locally
          await offlineDB.deleteCategory(categoryId);
        },
        { categoryId } as Record<string, unknown>,
        'categories',
        'delete'
      );

      options?.onSuccess?.(result);

      // Invalidate and refetch categories data to update UI
      await invalidateAndRefetch(queryClient, ["categories"]);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete category');
      console.error('❌ deleteCategory error:', error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    createCategory: { mutate: createCategory, isPending },
    updateCategory: { mutate: updateCategory, isPending },
    deleteCategory: { mutate: deleteCategory, isPending }
  };
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
      
      const result = await apiInterceptor.interceptGet(
        () => {
          return AssessmentsService.getAssessmentsByAssessmentId({ assessmentId });
        },
        async () => {
          // For offline fallback, get assessment and construct AssessmentDetailResponse
          const offlineAssessment = await offlineDB.getAssessment(assessmentId);
          if (!offlineAssessment) {
            // Check if this might be a temporary assessment that was just created
            
            // If it starts with 'temp_', it might be a temporary assessment
            if (assessmentId.startsWith('temp_')) {
              // Return a more user-friendly error that indicates waiting
              throw new Error('Assessment is being created, please wait...');
            }
            
            // For real assessment IDs that aren't found, provide better error message
            throw new Error(`Assessment ${assessmentId} not found. Please try refreshing the page or contact support if the problem persists.`);
          }
          
          // Get responses for this assessment
          const responses = await offlineDB.getResponsesByAssessment(assessmentId);
          
          // Get questions (we'll need to get all questions and filter by category)
          const allQuestions = await offlineDB.getAllQuestions();
          
          // Convert OfflineAssessment back to Assessment format
          const assessment: Assessment = {
            assessment_id: offlineAssessment.assessment_id,
            user_id: offlineAssessment.user_id,
            language: offlineAssessment.language,
            created_at: offlineAssessment.created_at,
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
          
          return {
            assessment,
            questions,
            responses: apiResponses,
          } as AssessmentDetailResponse;
        },
        'assessments',
        assessmentId
      );

      // Handle the case where the API returns AssessmentDetailResponse directly
      if (result && typeof result === 'object') {
        if ('assessment' in result && 'questions' in result && 'responses' in result) {
          // This is already an AssessmentDetailResponse
          setData(result as AssessmentDetailResponse);
        } else if ('assessment' in result) {
          // This is just an Assessment object, wrap it in AssessmentDetailResponse
          const assessment = (result as Record<string, unknown>).assessment as Assessment;
          setData({
            assessment,
            questions: [],
            responses: []
          } as AssessmentDetailResponse);
        } else {
          console.error('❌ Unexpected API response format:', result);
          setError(new Error('Unexpected API response format'));
        }
      } else {
        console.error('❌ Invalid API response:', result);
        setError(new Error('Invalid API response'));
      }
    } catch (err) {
      console.error('❌ Error fetching assessment:', err);
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

      // Delete all draft assessments (we'll let the server handle user-specific filtering)
      const allAssessments = await offlineDB.getAllAssessments();
      const draftAssessments = allAssessments.filter(a => a.status === 'draft');
      
      for (const draftAssessment of draftAssessments) {
        await offlineDB.deleteAssessment(draftAssessment.assessment_id);
      }

      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const tempAssessmentForTransform: Assessment = {
        assessment_id: tempId,
        user_id: "current_user", // This will be replaced by the server's response
        language: assessment.language,
        created_at: now,
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
        async (apiResponse: Record<string, unknown>) => {
          
          // Check if this is a valid API response or request data
          if (!apiResponse.assessment) {
            // This is the request data, not the API response
            console.warn('Received request data instead of API response - API call may have failed');
            return;
          }
          
          const realAssessment = apiResponse.assessment as Assessment;
          if (!realAssessment || !realAssessment.assessment_id) {
            console.error('API did not return a valid assessment:', apiResponse);
            throw new Error('API did not return a valid assessment');
          }
          
          // Delete the temporary assessment
          await offlineDB.deleteAssessment(tempId);
          
          // Save the real assessment with organization context
          const finalOfflineAssessment = DataTransformationService.transformAssessment(
            realAssessment, 
            organizationId, 
            userEmail
          );
          await offlineDB.saveAssessment(finalOfflineAssessment);
          
        },
        assessment as Record<string, unknown>,
        'assessments',
        'create'
      );

      // Only call onSuccess if we got a valid API response
      if (result && typeof result === 'object' && 'assessment' in result) {
        options?.onSuccess?.(result);
      } else {
        // This is request data, not API response - don't call onSuccess
      }
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

  const submitAssessment = useCallback(async (
    assessmentId: string,
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      const tempId = `temp_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Create a proper submission object for IndexedDB storage
      const tempSubmissionForTransform: Submission = {
        submission_id: tempId,
        assessment_id: assessmentId,
        user_id: "current_user", // This will be replaced by the server's response
        content: { 
          assessment: { assessment_id: assessmentId },
          responses: [] // Will be populated from responses in IndexedDB
        },
        review_status: 'under_review',
        submitted_at: now,
      };

      // Always store in IndexedDB first for offline support
      try {
        const offlineSubmission = DataTransformationService.transformSubmission(tempSubmissionForTransform);
        await offlineDB.saveSubmission(offlineSubmission);
      } catch (storageError) {
        console.error('❌ Failed to store submission in IndexedDB:', storageError);
        throw new Error(`Failed to store submission: ${storageError}`);
      }

      const result = await apiInterceptor.interceptMutation(
        () => AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId }),
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
        'submission',
        'create'
      );

      // Check if we're online to determine success behavior
      const isOnline = navigator.onLine;
      
      if (result && typeof result === 'object' && 'submission' in result) {
        // Online submission successful
        options?.onSuccess?.(result);
      } else if (!isOnline) {
        // Offline submission - stored in IndexedDB, will sync later
        const offlineSubmission = DataTransformationService.transformSubmission(tempSubmissionForTransform);
        options?.onSuccess?.({ submission: offlineSubmission });
      } else {
        // Online but API failed - still stored in IndexedDB for retry
        const offlineSubmission = DataTransformationService.transformSubmission(tempSubmissionForTransform);
        options?.onSuccess?.({ submission: offlineSubmission });
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error in submitAssessment:', err);
      const error = err instanceof Error ? err : new Error('Failed to submit assessment');
      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createAssessment, updateAssessment, deleteAssessment, submitAssessment, isPending };
}

// ===== RESPONSES =====

export function useOfflineResponses(assessmentId: string) {
  const [data, setData] = useState<{ responses: Response[] }>({ responses: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!assessmentId) {
      setData({ responses: [] });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => ResponsesService.getAssessmentsByAssessmentIdResponses({ assessmentId }),
        () => offlineDB.getResponsesByAssessment(assessmentId).then(responses => ({ responses })),
        'responses',
        assessmentId
      );

      setData(result);
    } catch (err) {
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

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const submissions = await offlineDB.getAllSubmissions();
      setData({ submissions });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch submissions');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return { data, isLoading, error, refetch: fetchSubmissions };
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

      // Delete from local storage first for immediate UI feedback
      await offlineDB.deleteSubmission(submissionId);

      // Since there's no delete endpoint for submissions in the API,
      // we handle it locally and mark it for sync if needed
      const result = { 
        success: true, 
        message: 'Submission deleted locally',
        submissionId 
      };
      
      options?.onSuccess?.(result);
      return result;
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
              responses: submission.content?.responses || []
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

export function useOfflineReports() {
  const [data, setData] = useState<{ reports: Report[] }>({ reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => ReportsService.getUserReports(),
        () => offlineDB.getAllReports().then(reports => ({ reports })),
        'reports'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reports'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
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