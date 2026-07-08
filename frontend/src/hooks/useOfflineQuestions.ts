import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import { QuestionService } from "@/openapi-rq/requests/services.gen";
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
      // Only attempt server sync when online
      if (navigator.onLine) {
        try {
          await apiInterceptor.interceptGet(
            () => QuestionService.getQuestions(),
            async () => null,
            'questions'
          );
        } catch {
          // Ignore sync errors, use local data
        }
      }
      // Always return data from IndexedDB as the single source of truth
      return await offlineDB.getAllQuestions();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (allow new questions to appear reasonably quickly)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
}

// Hook for question mutations (create, update, delete) with optimistic updates
export function useOfflineQuestionsMutation() {
  const queryClient = useQueryClient();

  // CREATE MUTATION
  const createQuestionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (question: CreateQuestionRequest & { display_order?: number }) => {
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
        display_order: question.display_order || 0,
        latest_revision: {
          question_revision_id: `temp_rev_${crypto.randomUUID()}`,
          question_id: tempId,
          text: question.text as Record<string, string>,
          weight: question.weight || 5,
          created_at: new Date().toISOString(),
        },
        revisions: [],
        is_active: true,
      };

      const localMutation = async () => {
        await offlineDB.saveQuestion(offlineQuestion);
      };

      const response = await apiInterceptor.interceptMutation(
        () => QuestionService.postQuestions({ requestBody: question as any }),
        localMutation,
        offlineQuestion as unknown as Record<string, unknown>,
        'question',
        'create'
      );

      // After successful API call, replace the temporary question with the real one
      if (response && (response as any).question) {
        await offlineDB.deleteQuestion(tempId);
        const categories = await offlineDB.getAllCategoryCatalogs();
        const categoryNameToIdMap = new Map(categories.map(c => [c.name.toLowerCase(), c.category_catalog_id]));
        const finalQuestion = DataTransformationService.transformQuestion((response as any).question, categoryNameToIdMap);
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
      queryClient.invalidateQueries({ queryKey: ['category-catalogs'] });
    },
  });

  // UPDATE MUTATION
  const updateQuestionMutation = useMutation({
    networkMode: 'always',
    mutationFn: async ({ questionId, question }: { questionId: string, question: UpdateQuestionRequest & { display_order?: number } }) => {
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
        display_order: question.display_order ?? existingQuestion.display_order,
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
        () => QuestionService.putQuestionsByQuestionId({ questionId, requestBody: question as any }),
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
      queryClient.invalidateQueries({ queryKey: ['category-catalogs'] });
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
          if (!questionId.startsWith('temp_')) {
            await QuestionService.deleteQuestionsByQuestionId({ questionId });
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
      queryClient.invalidateQueries({ queryKey: ['category-catalogs'] });
    },
  });

  return {
    createQuestion: createQuestionMutation.mutateAsync,
    updateQuestion: updateQuestionMutation.mutateAsync,
    deleteQuestion: deleteQuestionMutation.mutateAsync,
    isPending: createQuestionMutation.isPending || updateQuestionMutation.isPending || deleteQuestionMutation.isPending,
  };
}
