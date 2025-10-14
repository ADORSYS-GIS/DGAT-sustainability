import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  QuestionsService,
} from "@/openapi-rq/requests/services.gen";
import type { 
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionWithRevisionsResponse
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineQuestion,
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";

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