import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  SubmissionsService,
  AssessmentsService,
} from "@/openapi-rq/requests/services.gen";
import type {
  Submission,
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineResponse,
  OfflineAssessment,
  OfflineCategoryCatalog,
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
        async () => {
          const response = await SubmissionsService.getSubmissions();
          const submissions = response.submissions || [];

          const assessmentsResponse =
            await AssessmentsService.getAssessments();
          const assessments = assessmentsResponse.assessments || [];
          const categoryObjectMap = new Map(
            allCategories.map((c) => [c.category_catalog_id, c])
          );

          await offlineDB.saveAssessments(
            assessments.map((assessment) => {
              const offlineCategories = assessment.categories
                ?.map((catId) => categoryObjectMap.get(catId))
                .filter((cat): cat is OfflineCategoryCatalog => cat !== undefined);

              return {
                ...assessment,
                status: assessment.status as OfflineAssessment["status"],
                categories: offlineCategories,
                sync_status: "synced",
                updated_at: new Date().toISOString(),
              };
            })
          );

          const assessmentNameMap = new Map(
            assessments.map((a) => [a.assessment_id, a.name])
          );

          let organizationId: string | undefined;
          if (user?.organizations) {
            const orgKeys = Object.keys(user.organizations);
            if (orgKeys.length > 0) {
              const orgData = (user.organizations as Record<string, { id: string }>)[orgKeys[0]];
              organizationId = orgData?.id;
            }
          }

          const offlineSubmissions = submissions.map((s) => {
            const content = s.content as { assessment_name?: string };
            return {
              ...s,
              organization_id: organizationId || (user as any)?.organization,
              assessment_name:
                content?.assessment_name ||
                assessmentNameMap.get(s.assessment_id) ||
                "Unknown Assessment",
            };
          });

          await offlineDB.saveSubmissions(
            offlineSubmissions.map((s) => ({
              ...s,
              sync_status: "synced",
              updated_at: new Date().toISOString(),
            }))
          );

          return { submissions: offlineSubmissions };
        },
        async () => {
          const offlineSubmissions = await offlineDB.getAllSubmissions();
          const allAssessments = await offlineDB.getAllAssessments();
          const assessmentNameMap = new Map(
            allAssessments.map((a) => [a.assessment_id, a.name])
          );

          const submissionsWithNames = offlineSubmissions.map((s) => {
            const content = s.content as { assessment_name?: string };
            const submissionWithName = s as Submission & { assessment_name?: string };
            return {
              ...s,
              assessment_name:
                content?.assessment_name ||
                submissionWithName.assessment_name ||
                assessmentNameMap.get(s.assessment_id) ||
                "Unknown Assessment",
            };
          });

          const filteredSubmissions = submissionsWithNames.filter(
            s => s.review_status !== 'draft'
          );
          return { submissions: filteredSubmissions as unknown as Submission[] };
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

  // Listen for data sync events to refetch submissions
  useEffect(() => {
    const handleDataSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.entityType === 'submissions' ||
        customEvent.detail.entityType === 'submission') {
        console.log('🔍 useOfflineSubmissions: Received datasync event, refetching...', customEvent.detail.entityType);
        fetchSubmissions();
      }
    };

    window.addEventListener('datasync', handleDataSync);
    return () => {
      window.removeEventListener('datasync', handleDataSync);
    };
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

      // Store the assessment_id before deletion for cache invalidation
      const assessmentId = existingSubmission.assessment_id;

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

      // CRITICAL: When a submission is deleted, the backend also deletes the associated assessment
      // We need to remove it from the local cache to prevent it from appearing as a draft assessment
      if (assessmentId) {
        console.log('🔍 deleteSubmission: Removing associated assessment from cache', assessmentId);
        try {
          await offlineDB.deleteAssessment(assessmentId);
        } catch (assessmentDeleteError) {
          console.warn('⚠️ Failed to delete associated assessment from cache:', assessmentDeleteError);
          // Don't fail the entire operation if assessment deletion fails
        }
      }

      // Dispatch cache invalidation events for both submissions and assessments
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'submissions' } }));
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'assessments' } }));
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'draft_assessments' } }));

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
