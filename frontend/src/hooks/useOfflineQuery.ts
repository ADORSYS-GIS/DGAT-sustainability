import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineDB } from '../services/indexeddb';
import { syncService, SyncStatus } from '../services/syncService';

interface OfflineQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  localDataFn: () => Promise<T | null>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface OfflineMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  localMutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  // Additional options for sync queue
  getUrl?: (variables: TVariables) => string;
  getMethod?: (variables: TVariables) => 'POST' | 'PUT' | 'DELETE';
  getEntityType?: (variables: TVariables) => 'assessment' | 'response' | 'submission' | 'question';
  getEntityId?: (variables: TVariables) => string;
  getOperation?: (variables: TVariables) => 'create' | 'update' | 'delete';
}

// Custom hook for offline-first queries
export function useOfflineQuery<T>(options: OfflineQueryOptions<T>) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const queryClient = useQueryClient();

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for sync status changes
  useEffect(() => {
    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);

      // Invalidate queries when sync completes
      if (status.type === 'sync_complete') {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }
    };

    syncService.addSyncListener(handleSyncStatus);

    return () => {
      syncService.removeSyncListener(handleSyncStatus);
    };
  }, [queryClient, options.queryKey]);

  // Main query with offline-first strategy
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      try {
        // Try local data first
        const localData = await options.localDataFn();

        if (localData && !isOnline) {
          // Return local data if offline
          return localData;
        }

        if (isOnline) {
          try {
            // Try network data if online
            const networkData = await options.queryFn();
            return networkData;
          } catch (networkError) {
            // Fallback to local data if network fails
            if (localData) {
              console.warn('Network failed, using local data:', networkError);
              return localData;
            }
            throw networkError;
          }
        }

        // Return local data if available
        if (localData) {
          return localData;
        }

        throw new Error('No data available offline');
      } catch (error) {
        console.error('Query failed:', error);
        throw error;
      }
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? (isOnline ? 5 * 60 * 1000 : Infinity), // 5 minutes online, never stale offline
    gcTime: options.cacheTime ?? 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? isOnline,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
  });

  return {
    ...query,
    isOnline,
    syncStatus,
  };
}

// Custom hook for offline-first mutations
export function useOfflineMutation<TData, TVariables>(
  options: OfflineMutationOptions<TData, TVariables>
) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        if (isOnline) {
          // Try network mutation first if online
          try {
            const result = await options.mutationFn(variables);
            return result;
          } catch (networkError) {
            console.warn('Network mutation failed, using local mutation:', networkError);
            // Fallback to local mutation and queue for sync
            const result = await options.localMutationFn(variables);

            // Add to sync queue with proper details
            await offlineDB.addToSyncQueue({
              operation: options.getOperation?.(variables) || 'update',
              entity_type: options.getEntityType?.(variables) || 'response',
              entity_id: options.getEntityId?.(variables) || '',
              data: variables,
              url: options.getUrl?.(variables) || '',
              method: options.getMethod?.(variables) || 'PUT',
              max_retries: 3,
            });

            return result;
          }
        } else {
          // Use local mutation if offline
          const result = await options.localMutationFn(variables);

          // Add to sync queue with proper details
          await offlineDB.addToSyncQueue({
            operation: options.getOperation?.(variables) || 'update',
            entity_type: options.getEntityType?.(variables) || 'response',
            entity_id: options.getEntityId?.(variables) || '',
            data: variables,
            url: options.getUrl?.(variables) || '',
            method: options.getMethod?.(variables) || 'PUT',
            max_retries: 3,
          });

          return result;
        }
      } catch (error) {
        console.error('Mutation failed:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options.onError?.(error as Error, variables);
    },
    onSettled: (data, error, variables) => {
      options.onSettled?.(data, error, variables);
    },
  });

  return {
    ...mutation,
    isOnline,
  };
}

// Hook for questions with offline support
export function useOfflineQuestions(params?: { category?: string; language?: string }) {
  return useOfflineQuery({
    queryKey: ['questions', params],
    queryFn: async () => {
      const response = await fetch('/api/v1/questions?' + new URLSearchParams(params || {}));
      if (!response.ok) throw new Error('Failed to fetch questions');
      return response.json();
    },
    localDataFn: async () => {
      const questions = await offlineDB.getAllQuestions();

      // Filter by category if specified
      const filteredQuestions = params?.category 
        ? questions.filter(q => q.category === params.category)
        : questions;

      // Transform to match API response format
      return {
        questions: filteredQuestions.map(q => ({
          question: {
            question_id: q.question_id,
            category: q.category,
          },
          revisions: q.revisions,
        })),
      };
    },
  });
}

// Hook for assessments with offline support
export function useOfflineAssessments(userId?: string) {
  return useOfflineQuery({
    queryKey: ['assessments', userId],
    queryFn: async () => {
      const response = await fetch('/api/v1/assessments');
      if (!response.ok) throw new Error('Failed to fetch assessments');
      return response.json();
    },
    localDataFn: async () => {
      const assessments = userId 
        ? await offlineDB.getAssessmentsByUser(userId)
        : await offlineDB.getAllAssessments();

      return {
        assessments: assessments.map(a => ({
          assessment_id: a.assessment_id,
          user_id: a.user_id,
          language: a.language,
          created_at: a.created_at,
        })),
      };
    },
  });
}

// Hook for assessment detail with offline support
export function useOfflineAssessmentDetail(assessmentId: string) {
  return useOfflineQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/assessments/${assessmentId}`);
      if (!response.ok) throw new Error('Failed to fetch assessment detail');
      return response.json();
    },
    localDataFn: async () => {
      const [assessment, responses, questions] = await Promise.all([
        offlineDB.getAssessment(assessmentId),
        offlineDB.getLatestResponsesByAssessment(assessmentId),
        offlineDB.getAllQuestions(),
      ]);

      if (!assessment) return null;

      // Get question revisions for the responses
      const questionRevisions = responses.map(response => {
        const question = questions.find(q => 
          q.revisions.some(r => r.question_revision_id === response.question_revision_id)
        );
        return question?.revisions.find(r => r.question_revision_id === response.question_revision_id);
      }).filter(Boolean);

      return {
        assessment: {
          assessment_id: assessment.assessment_id,
          user_id: assessment.user_id,
          language: assessment.language,
          created_at: assessment.created_at,
        },
        questions: questionRevisions,
        responses: responses.map(r => ({
          response_id: r.response_id,
          assessment_id: r.assessment_id,
          question_revision_id: r.question_revision_id,
          response: r.response,
          version: r.version,
          updated_at: r.updated_at,
        })),
      };
    },
    enabled: !!assessmentId,
  });
}

// Hook for submissions with offline support
export function useOfflineSubmissions(userId?: string) {
  return useOfflineQuery({
    queryKey: ['submissions', userId],
    queryFn: async () => {
      const response = await fetch('/api/v1/submissions');
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    localDataFn: async () => {
      const submissions = userId 
        ? await offlineDB.getSubmissionsByUser(userId)
        : [];

      return {
        submissions: submissions.map(s => ({
          submission_id: s.submission_id,
          assessment_id: s.assessment_id,
          user_id: s.user_id,
          content: s.content,
          review_status: s.review_status,
          submitted_at: s.submitted_at,
          reviewed_at: s.reviewed_at,
        })),
      };
    },
  });
}

// Hook for creating/updating responses with offline support
export function useOfflineResponseMutation(assessmentId: string) {
  return useOfflineMutation({
    mutationFn: async (variables: { 
      questionRevisionId: string; 
      response: string; 
      responseId?: string;
    }) => {
      const url = variables.responseId 
        ? `/api/v1/assessments/${assessmentId}/responses/${variables.responseId}`
        : `/api/v1/assessments/${assessmentId}/responses`;

      const method = variables.responseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_revision_id: variables.questionRevisionId,
          response: variables.response,
        }),
      });

      if (!response.ok) throw new Error('Failed to save response');
      return response.json();
    },
    localMutationFn: async (variables: { 
      questionRevisionId: string; 
      response: string; 
      responseId?: string;
    }) => {
      const responseId = variables.responseId || crypto.randomUUID();

      // Get current version for conflict resolution
      const existingResponse = variables.responseId 
        ? await offlineDB.getResponse(variables.responseId)
        : null;

      const responseData = {
        response_id: responseId,
        assessment_id: assessmentId,
        question_revision_id: variables.questionRevisionId,
        response: variables.response,
        version: existingResponse ? existingResponse.version + 1 : 1,
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const,
        local_changes: true,
      };

      await offlineDB.saveResponse(responseData);

      return { response: responseData };
    },
  });
}

// Hook for sync status
export function useSyncStatus() {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    lastSync?: string;
    pendingItems: number;
    conflicts: number;
  } | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const syncStatus = await syncService.getSyncStatus();
      setStatus(syncStatus);
    };

    updateStatus();

    const handleSyncStatus = () => {
      updateStatus();
    };

    syncService.addSyncListener(handleSyncStatus);

    return () => {
      syncService.removeSyncListener(handleSyncStatus);
    };
  }, []);

  return status;
}
