import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  AssessmentsService,
} from "@/openapi-rq/requests/services.gen";
import type {
  Assessment,
  Submission,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentDetailResponse,
  Response,
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineAssessment,
  OfflineAssessmentDetailResponse
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";

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
          // Transform OfflineAssessment back to Assessment for API compatibility
          const transformedAssessments = allAssessments.map(assessment => ({
            ...assessment,
            categories: assessment.categories?.map(cat => cat.category_catalog_id) || [],
          }));
          return { assessments: transformedAssessments };
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
          return AssessmentsService.getAssessments({
            status: 'draft',
          });
        },
        async () => {
          console.log('🔍 useOfflineDraftAssessments: Using offline fallback');
          // For offline fallback, get only draft assessments using backend filtering
          const draftAssessments = await offlineDB.getAssessmentsByStatus('draft');
          console.log('🔍 useOfflineDraftAssessments: Raw assessments from IndexedDB:', draftAssessments);
          // Transform OfflineAssessment back to Assessment for API compatibility
          const transformedAssessments = draftAssessments.map(assessment => ({
            ...assessment,
            categories: assessment.categories?.map(cat => cat.category_catalog_id) || [],
          }));
          return { assessments: transformedAssessments };
        },
        'draft_assessments'
      );

      console.log('🔍 useOfflineDraftAssessments: API response received:', result);

      // Fetch submissions to filter out assessments that have already been submitted
      const allSubmissions = await offlineDB.getAllSubmissions();
      const submittedAssessmentIds = new Set(allSubmissions.map(s => s.assessment_id));

      // Transform API response to match OfflineAssessment type and filter for draft only
      const categories = await offlineDB.getAllCategoryCatalogs();
      const categoryIdToCategoryMap = new Map(
        categories.map(cat => [cat.category_catalog_id, cat])
      );

      const transformedResult = {
        assessments: DataTransformationService.transformAssessmentsWithContext(
          result.assessments,
          categoryIdToCategoryMap
        ).filter(assessment =>
          assessment.status === 'draft' && !submittedAssessmentIds.has(assessment.assessment_id)
        )
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

  // Listen for cache invalidation events
  useEffect(() => {
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.entityType === 'assessments' ||
        customEvent.detail.entityType === 'draft_assessments' ||
        customEvent.detail.entityType === 'submission' ||
        customEvent.detail.entityType === 'submissions') {
        console.log('🔍 useOfflineDraftAssessments: Received datasync event, refetching...', customEvent.detail.entityType);
        fetchData();
      }
    };

    window.addEventListener('datasync', handleDataSync);
    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
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
          let offlineAssessment = await offlineDB.getAssessment(assessmentId);

          // If it's a temporary assessment and not found immediately, retry a few times
          if (!offlineAssessment && assessmentId.startsWith('temp_')) {
            let attempts = 0;
            const maxAttempts = 5;
            while (!offlineAssessment && attempts < maxAttempts) {
              console.log(`🔍 useOfflineAssessment: Temporary assessment ${assessmentId} not found, retrying... (Attempt ${attempts + 1}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
              offlineAssessment = await offlineDB.getAssessment(assessmentId);
              attempts++;
            }
          }

          if (!offlineAssessment) {
            console.log(`🔍 useOfflineAssessment: Assessment ${assessmentId} not found in IndexedDB after retries.`);
            throw new Error(`Assessment ${assessmentId} not found. Please try refreshing the page or contact support if the problem persists.`);
          }
          console.log(`🔍 useOfflineAssessment: Retrieved from IndexedDB:`, offlineAssessment);

          const [responses, allQuestions, allCategories] = await Promise.all([
            offlineDB.getResponsesByAssessment(assessmentId),
            offlineDB.getAllQuestions(),
            offlineDB.getAllCategoryCatalogs(),
          ]);

          const assessmentCategoryIds = new Set(offlineAssessment.categories?.map(c => c.category_catalog_id) || []);
          const filteredQuestions = allQuestions
            .filter(q => assessmentCategoryIds.has(q.category_id))
            .map(q => q.latest_revision);

          const filteredCategories = allCategories.filter(cat => assessmentCategoryIds.has(cat.category_catalog_id));

          const assessment: Assessment = {
            assessment_id: offlineAssessment.assessment_id,
            org_id: offlineAssessment.org_id || '',
            language: offlineAssessment.language || 'en',
            name: offlineAssessment.name || 'Untitled Assessment',
            status: offlineAssessment.status || 'draft',
            created_at: offlineAssessment.created_at || new Date().toISOString(),
            updated_at: offlineAssessment.updated_at || new Date().toISOString(),
            categories: filteredCategories.map(c => c.category_catalog_id) || []
          };

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

          const apiResponses: (Response & { question_text?: string; question_category?: string })[] = responses.map(r => {
            const details = questionDetailsMap.get(r.question_revision_id);
            return {
              response_id: r.response_id,
              assessment_id: r.assessment_id,
              question_revision_id: r.question_revision_id,
              response: r.response,
              version: r.version,
              updated_at: r.updated_at,
              question_text: details?.text,
              question_category: details?.category,
            };
          });

          const assessmentDetailResponse: OfflineAssessmentDetailResponse = {
            assessment,
            questions: filteredQuestions,
            responses: apiResponses,
            categories: filteredCategories, // Add filtered categories to the response
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
  ): Promise<Record<string, unknown>> => {
    console.log("useOfflineAssessments: Entering createAssessment function.");
    setIsPending(true); // Set pending at the very beginning

    try {
      // VALIDATION: Ensure at least one category is selected
      if (!assessment.categories || assessment.categories.length === 0) {
        const error = new Error("An assessment must have at least one category selected.");
        console.error('❌ useOfflineAssessments: Assessment creation failed locally:', error);
        options?.onError?.(error);
        throw error;
      }

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

      const categories = await offlineDB.getAllCategoryCatalogs();
      const categoryIdToCategoryMap = new Map(
        categories.map(cat => [cat.category_catalog_id, cat])
      );

      const offlineAssessment = DataTransformationService.transformAssessment(
        tempAssessmentForTransform,
        categoryIdToCategoryMap,
        organizationId,
        userEmail
      );
      offlineAssessment.sync_status = 'pending';

      await offlineDB.saveAssessment(offlineAssessment); // This is the critical local save

      await apiInterceptor.addToSyncQueue(
        offlineAssessment as unknown as Record<string, unknown>,
        'assessments',
        'create'
      );

      let result: Record<string, unknown> = { assessment: offlineAssessment, offline: true }; // Default to offline success

      if (!navigator.onLine) {
        console.log("useOfflineAssessments: Offline path - calling onSuccess.");
        options?.onSuccess?.(result);
        return result;
      }

      try {
        const apiResult = await apiInterceptor.interceptMutation(
          () => AssessmentsService.postAssessments({ requestBody: assessment }),
          async () => { /* local update handled by interceptor */ },
          assessment as Record<string, unknown>,
          'assessments',
          'create'
        );

        type AssessmentResponse = { assessment: Assessment };
        const isAssessmentResponse = (res: unknown): res is AssessmentResponse => {
          return (
            typeof res === 'object' &&
            res !== null &&
            'assessment' in res &&
            typeof (res as { assessment: { assessment_id: unknown } }).assessment.assessment_id === 'string'
          );
        }

        if (isAssessmentResponse(apiResult)) {
          await offlineDB.deleteAssessment(tempId); // Clean up temp assessment
          result = apiResult; // Use the real API result
        } else {
          console.warn("useOfflineAssessments: API call succeeded but returned unexpected format. Using offline assessment for UI.", apiResult);
          result = { assessment: offlineAssessment, offline: true, apiResult: apiResult };
        }
        console.log("useOfflineAssessments: Online API call successful - calling onSuccess.");
        options?.onSuccess?.(result);
        return result;

      } catch (apiError) {
        console.warn("useOfflineAssessments: API call failed during online assessment creation, but local save was successful. Treating as offline success for UI.", apiError);
        result = { assessment: offlineAssessment, offline: true, apiError: apiError };
        console.log("useOfflineAssessments: Online API failed, local save successful - calling onSuccess.");
        options?.onSuccess?.(result);
        return result;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create assessment locally');
      console.error('❌ useOfflineAssessments: Assessment creation failed locally:', error);
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

          const categories = await offlineDB.getAllCategoryCatalogs();
          const categoryIdToCategoryMap = new Map(
            categories.map(cat => [cat.category_catalog_id, cat])
          );
          const offlineAssessment = DataTransformationService.transformAssessment(realAssessment, categoryIdToCategoryMap);
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
        let assessment = await offlineDB.getAssessment(assessmentId);

        // Retry logic if not found immediately (e.g. if just created)
        if (!assessment) {
          let attempts = 0;
          const maxAttempts = 5;
          while (!assessment && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            assessment = await offlineDB.getAssessment(assessmentId);
            attempts++;
          }
        }

        // Note: We'll need to add draft submission storage to IndexedDB
        // For now, we'll store it as a regular submission with a special status
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: assessment?.name || 'Unknown Assessment',
          review_status: 'pending_review', // Changed to 'pending_review'
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
        async () => {
          // Optimistic update: mark assessment as submitted locally
          const assessment = await offlineDB.getAssessment(assessmentId);
          if (assessment) {
            await offlineDB.saveAssessment({
              ...assessment,
              status: 'submitted',
              sync_status: 'pending' // Keep pending so interceptGet merges it
            });
          }
        },
        { assessmentId, tempId } as Record<string, unknown>,
        'submission',
        'submit'
      );

      type SubmissionResponse = { submission: Submission };
      const isSubmissionResponse = (res: unknown): res is SubmissionResponse => {
        return (
          typeof res === 'object' &&
          res !== null &&
          'submission' in res &&
          typeof (res as { submission: { submission_id: unknown } }).submission.submission_id === 'string'
        );
      }

      if (isSubmissionResponse(result)) {
        // This was a successful online request, the interceptor saved the real submission.
        // Now we can safely delete the temporary one.
        await offlineDB.deleteSubmission(tempId);
      }

      // Check if we're online to determine success behavior
      const isOnline = navigator.onLine;

      if (result && typeof result === 'object' && 'submission' in result) {
        // Online draft submission successful
        options?.onSuccess?.(result);
      } else if (!isOnline) {
        // Offline draft submission - stored in IndexedDB, will sync later
        const assessment = await offlineDB.getAssessment(assessmentId);
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: assessment?.name || 'Unknown Assessment',
          review_status: 'pending_review', // Changed to 'pending_review'
        });
        options?.onSuccess?.({ submission: offlineSubmission });
      } else {
        // Online but API failed - still stored in IndexedDB for retry
        const assessment = await offlineDB.getAssessment(assessmentId);
        const offlineSubmission = DataTransformationService.transformSubmission({
          ...tempDraftSubmissionForTransform,
          submission_id: tempId,
          assessment_name: assessment?.name || 'Unknown Assessment',
          review_status: 'pending_review', // Changed to 'pending_review'
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

  return { createAssessment, updateAssessment, deleteAssessment, submitDraftAssessment, isPending };
}