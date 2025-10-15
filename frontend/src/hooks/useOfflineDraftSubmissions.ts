import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  AdminService,
  AssessmentsService,
} from "@/openapi-rq/requests/services.gen";
import type {
Submission,
Assessment,
AdminSubmissionDetail,
AdminSubmissionListResponse,
AssessmentListResponse,
SubmissionDetailResponse,
} from "@/openapi-rq/requests/types.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTransformationService } from "../services/dataTransformation";
import type { OfflineAssessment, OfflineDraftSubmission, OfflineCategoryCatalog } from "@/types/offline";

// Type guard to check if the response is from the online API for assessments
function isOnlineAssessmentList(response: unknown): response is AssessmentListResponse {
  if (!response || typeof response !== 'object' || !('assessments' in response)) {
    return false;
  }
  const { assessments } = response as { assessments: unknown };
  if (!Array.isArray(assessments)) {
    return false;
  }
  return assessments.length === 0 || !('sync_status' in assessments[0]);
}

// Type guard to check if the response is from the online API
function isOnlineAdminSubmissionList(response: unknown): response is AdminSubmissionListResponse {
  if (!response || typeof response !== 'object' || !('submissions' in response)) {
    return false;
  }
  const { submissions } = response as { submissions: unknown };
  if (!Array.isArray(submissions)) {
    return false;
  }
  return submissions.length === 0 || 'org_id' in submissions[0];
}

export function useOfflineDraftSubmissions() {
  const [data, setData] = useState<{ draft_submissions: OfflineDraftSubmission[] }>({ draft_submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const localCategories = await offlineDB.getAllCategoryCatalogs();
      const categoryIdToCategoryMap = new Map<string, OfflineCategoryCatalog>(
        localCategories.map(c => [c.category_catalog_id, c])
      );

      const [onlineDraftsResult, onlineAssessmentsResult] = await Promise.all([
        apiInterceptor.interceptGet(
          () => AdminService.getDrafts(),
          () => offlineDB.getAllDraftSubmissions().then(submissions => ({ submissions })),
          'drafts'
        ),
        apiInterceptor.interceptGet(
          () => AssessmentsService.getAssessments(),
          () => offlineDB.getAllAssessments().then(assessments => ({ assessments })),
          'assessments'
        )
      ]);

      if (isOnlineAssessmentList(onlineAssessmentsResult)) {
        const offlineAssessments = (onlineAssessmentsResult.assessments as Assessment[]).map(
          (assessment) => DataTransformationService.transformAssessment(assessment, categoryIdToCategoryMap)
        ) as OfflineAssessment[];
        await offlineDB.saveAssessments(offlineAssessments);
      }

      if (isOnlineAdminSubmissionList(onlineDraftsResult)) {
        const adminSubmissions = onlineDraftsResult.submissions;
        const allAssessments = await offlineDB.getAllAssessments();
        const assessmentsMap = new Map<string, string>(
            allAssessments.map(a => [a.assessment_id, a.name])
        );

        const offlineDrafts = (adminSubmissions as AdminSubmissionDetail[]).map(
          (submission) => DataTransformationService.transformAdminSubmission(
              submission,
              assessmentsMap.get(submission.assessment_id) || 'Unknown Assessment'
          )
        );
        await offlineDB.saveDraftSubmissions(offlineDrafts as unknown as OfflineDraftSubmission[]);
      }

      const [localDrafts, localAssessments] = await Promise.all([
        offlineDB.getAllDraftSubmissions(),
        offlineDB.getAllAssessments(),
      ]);

      const assessmentsMap = new Map<string, string>();
      if (localAssessments) {
        for (const assessment of localAssessments) {
          if (assessment.assessment_id && assessment.name) {
            assessmentsMap.set(assessment.assessment_id, assessment.name);
          }
        }
      }

      const submissions = localDrafts.map((submission) => ({
        ...submission,
        assessment_name: assessmentsMap.get(submission.assessment_id) || 'Unknown Assessment'
      }));

      setData({ draft_submissions: submissions });
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

export function useOfflineDraftSubmissionsMutation() {
  const queryClient = useQueryClient();

  const approveDraftSubmission = useMutation({
    networkMode: 'always', // Ensure mutation runs regardless of network status
    mutationFn: async (submissionId: string) => {
      console.log(`[Mutation] 1. Starting approval for submissionId: ${submissionId}`);
      
      const draft = await offlineDB.getDraftSubmission(submissionId);
      if (!draft) {
        console.error(`[Mutation] 2. Draft with id ${submissionId} not found in local DB.`);
        throw new Error(`Draft submission with id ${submissionId} not found in local DB.`);
      }
      console.log(`[Mutation] 2. Found draft:`, draft);
      
      const { assessment_id: assessmentId } = draft;

      const apiCall = () => {
        console.log(`[Mutation] 5a. [Online] Executing API call: postAssessmentsByAssessmentIdSubmit with assessmentId: ${assessmentId}`);
        return AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId });
      };

      const localMutation = async () => {
        console.log(`[Mutation] 3. Performing local mutation for submissionId: ${submissionId}`);
        // Update the draft's status to pending and approved, but keep it in draft_submissions
        const updatedDraft: OfflineDraftSubmission = {
          ...draft,
          review_status: 'approved' as const,
          sync_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        };
        await offlineDB.saveDraftSubmission(updatedDraft); // Save back to draft_submissions
        console.log(`[Mutation] 4. Local mutation complete. Draft ${submissionId} marked as pending for submission.`);
      };

      return apiInterceptor.interceptMutation(
        apiCall,
        localMutation,
        draft as unknown as Record<string, unknown>, // Pass the entire draft object as data for the sync queue
        'draft_submission', // Entity type is 'draft_submission' as it's still in that table
        'submit' // Operation is 'submit'
      );
    },
    onSuccess: (data) => {
      console.log('[Mutation] onSuccess: Mutation was successful. Data:', data);
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin_submissions'] });
      console.log('[Mutation] onSuccess: Queries invalidated.');
    },
    onError: (error) => {
      console.error("[Mutation] onError: An error occurred during the mutation.", error);
    },
    onSettled: () => {
      console.log('[Mutation] onSettled: Mutation has settled (either success or error).');
    }
  });

  return { approveDraftSubmission };
}