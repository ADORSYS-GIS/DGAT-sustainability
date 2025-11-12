import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  ResponsesService,
} from "@/openapi-rq/requests/services.gen";
import type { 
  Response,
  CreateResponseRequest,
  UpdateResponseRequest,
} from "@/openapi-rq/requests/types.gen";
import { DataTransformationService } from "../services/dataTransformation";

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
        async () => {
          // Optimistic update is already done by saving the temp responses.
        },
        { assessmentId, responses } as Record<string, unknown>,
        'responses',
        'create'
      );

      type ResponsesResponse = { responses: Response[] };
      const isResponsesResponse = (res: unknown): res is ResponsesResponse => {
        return (
            typeof res === 'object' &&
            res !== null &&
            'responses' in res &&
            Array.isArray((res as ResponsesResponse).responses)
        );
      }

      if (isResponsesResponse(result)) {
        // This was a successful online request, the interceptor saved the real responses.
        // Now we can safely delete the temporary ones.
        for (const tempResponse of tempOfflineResponses) {
          await offlineDB.deleteResponse(tempResponse.response_id);
        }
      }

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