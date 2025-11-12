import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import { QuestionsService } from "@/openapi-rq/requests/services.gen";
import type {
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from "@/openapi-rq/requests/types.gen";
import { DataTransformationService } from "../services/dataTransformation";
import type { OfflineQuestion } from "@/types/offline";
import type { OfflineCategoryCatalog } from "@/types/offline";

// Hook to fetch questions with offline support
export function useOfflineQuestions() {
  return useQuery({
    queryKey: ["questions"],
    queryFn: async (): Promise<OfflineQuestion[]> => {
      try {
        // Attempt to sync with the server, but don't block
        apiInterceptor.interceptGet(
          () => QuestionsService.getQuestions(),
          async () => null, // We don't need a fallback, just the sync trigger
          'questions'
        );
      } catch (error) {
        console.log("Could not sync questions, using local data.", error);
      }
      // Always return data from IndexedDB as the single source of truth
      return await offlineDB.getAllQuestions();
    },
  });
}

// Hook for question mutations (create, update, delete) with optimistic updates
export function useOfflineQuestionsMutation() {
  const queryClient = useQueryClient();

  // CREATE MUTATION
  const createQuestionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (question: CreateQuestionRequest & { order?: number }) => {
      const categories = queryClient.getQueryData<OfflineCategoryCatalog[]>(['category-catalogs']) || [];
      const categoryMap = new Map(categories.map(c => [c.category_catalog_id, c.name]));
      const categoryName = categoryMap.get(question.category_id) || "Unknown Category";

      const tempId = `temp_${crypto.randomUUID()}`;
      const offlineQuestion: OfflineQuestion = {
        question_id: tempId,
        category_id: question.category_id,
        category: categoryName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
        order: question.order,
        latest_revision: {
          question_revision_id: `temp_rev_${crypto.randomUUID()}`,
          question_id: tempId,
          text: question.text as Record<string, string>,
          weight: question.weight || 5,
          created_at: new Date().toISOString(),
        },
        revisions: [],
      };

      const localMutation = async () => {
        await offlineDB.saveQuestion(offlineQuestion);
      };

      const response = await apiInterceptor.interceptMutation(
        () => QuestionsService.postQuestions({ requestBody: question }),
        localMutation,
        offlineQuestion as unknown as Record<string, unknown>,
        'question',
        'create'
      );

      // After successful API call, replace the temporary question with the real one
      if (response && response.question) {
        await offlineDB.deleteQuestion(tempId);
        const categories = await offlineDB.getAllCategoryCatalogs();
        const categoryIdToNameMap = new Map(categories.map(c => [c.category_catalog_id, c.name]));
        const finalQuestion = DataTransformationService.transformQuestion(response.question, categoryIdToNameMap);
        await offlineDB.saveQuestion(finalQuestion);
        return { finalQuestion, tempId };
      }
      
      return { finalQuestion: offlineQuestion, tempId };
    },
    onSuccess: (data) => {
      // Optimistically update the cache to replace the temp item with the real one
      queryClient.setQueryData<OfflineQuestion[]>(['questions'], (old) => {
        if (!old) return [data.finalQuestion];
        // Remove the temporary item
        const withoutTemp = old.filter(q => q.question_id !== data.tempId);
        // Add the final, permanent item
        return [...withoutTemp, data.finalQuestion];
      });
      // Invalidate to ensure consistency with the server in the background
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // UPDATE MUTATION
  const updateQuestionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async ({ questionId, question }: { questionId: string, question: UpdateQuestionRequest }) => {
      const categories = queryClient.getQueryData<OfflineCategoryCatalog[]>(['category-catalogs']) || [];
      const categoryMap = new Map(categories.map(c => [c.category_catalog_id, c.name]));
      
      const existingQuestion = await offlineDB.getQuestion(questionId);
      if (!existingQuestion) {
        throw new Error("Question not found for update");
      }

      const categoryName = categoryMap.get(question.category_id) || existingQuestion.category;
      const updatedQuestion: OfflineQuestion = {
        ...existingQuestion,
        category_id: question.category_id,
        category: categoryName,
        latest_revision: {
          ...existingQuestion.latest_revision,
          text: question.text as Record<string, string>,
          weight: question.weight,
          created_at: new Date().toISOString(),
        },
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      const localMutation = async () => {
        await offlineDB.saveQuestion(updatedQuestion);
      };

      await apiInterceptor.interceptMutation(
        () => QuestionsService.putQuestionsByQuestionId({ questionId, requestBody: question }),
        localMutation,
        updatedQuestion as unknown as Record<string, unknown>,
        'question',
        'update'
      );
      return updatedQuestion;
    },
    onSuccess: (updatedQuestion) => {
      queryClient.setQueryData<OfflineQuestion[]>(['questions'], (old) =>
        old?.map(q => q.question_id === updatedQuestion.question_id ? updatedQuestion : q)
      );
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  // DELETE MUTATION
  const deleteQuestionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (questionId: string) => {
      const questionToDelete = await offlineDB.getQuestion(questionId);
      const revisionId = questionToDelete?.latest_revision?.question_revision_id;

      const localMutation = async () => {
        await offlineDB.deleteQuestion(questionId);
      };

      await apiInterceptor.interceptMutation(
        async () => {
          if (revisionId && !questionId.startsWith('temp_')) {
            await QuestionsService.deleteQuestionsRevisionsByQuestionRevisionId({ questionRevisionId: revisionId });
          }
          return { success: true, question_id: questionId };
        },
        localMutation,
        { question_id: questionId },
        'question',
        'delete'
      );
      return { questionId };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<OfflineQuestion[]>(['questions'], (old) =>
        old?.filter(q => q.question_id !== data.questionId)
      );
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  return {
    createQuestion: createQuestionMutation.mutateAsync,
    updateQuestion: updateQuestionMutation.mutateAsync,
    deleteQuestion: deleteQuestionMutation.mutateAsync,
    isPending: createQuestionMutation.isPending || updateQuestionMutation.isPending || deleteQuestionMutation.isPending,
  };
}