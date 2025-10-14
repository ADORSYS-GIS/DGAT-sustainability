import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  SubmissionsService,
} from "@/openapi-rq/requests/services.gen";
import type { 
  Submission,
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineResponse,
} from "@/types/offline";
import { useAuth } from "./shared/useAuth";

export function useOfflineSubmissions() {
  const [data, setData] = useState<{ submissions: Submission[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch questions and categories from local DB to build the enrichment map
      const [allQuestions, allCategories] = await Promise.all([
        offlineDB.getAllQuestions(),
        offlineDB.getAllCategoryCatalogs(),
      ]);

      const questionDetailsMap = new Map<string, { text: string; category: string }>();
      const categoryMap = new Map(allCategories.map(c => [c.category_catalog_id, c.name]));

      allQuestions.forEach(q => {
        if (q.latest_revision) {
          questionDetailsMap.set(q.latest_revision.question_revision_id, {
            text: q.latest_revision.text as unknown as string,
            category: categoryMap.get(q.category_id) || "Uncategorized",
          });
        }
      });

      // Fetch submissions (online or offline)
      const result = await apiInterceptor.interceptGet(
        () => SubmissionsService.getSubmissions(),
        async () => {
          const offlineSubmissions = await offlineDB.getAllSubmissions();
          return { submissions: offlineSubmissions as unknown as Submission[] };
        },
        'submissions'
      );

      // Transform the submissions data regardless of source
      const transformedSubmissions = (result.submissions || []).map(s => {
        const enrichedResponses = s.content?.responses?.map(r => {
          const responseWithExtras = r as unknown as {
            question_revision_id?: string;
            question_category?: string;
            question_text?: string;
            question?: { en?: string };
          };

          const details = questionDetailsMap.get(responseWithExtras.question_revision_id || '');
          const category = responseWithExtras.question_category || details?.category;
          const text = responseWithExtras.question_text || responseWithExtras.question?.en || details?.text;

          return {
            ...r,
            question_category: category,
            question_text: text,
          };
        }) || [];

        return {
          ...s,
          content: {
            ...s.content,
            responses: enrichedResponses,
          },
        };
      });

      setData({ submissions: transformedSubmissions as Submission[] });
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