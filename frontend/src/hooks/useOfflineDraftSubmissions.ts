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
import type { OfflineAssessment, OfflineDraftSubmission, OfflineCategoryCatalog, OfflineSubmission } from "@/types/offline";
import { useAuth } from "./shared/useAuth";

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
function isOnlineAdminSubmissionList(response: unknown): response is { draft_submissions: AdminSubmissionDetail[] } {
  if (!response || typeof response !== 'object' || !('draft_submissions' in response)) {
    return false;
  }
  const { draft_submissions } = response as { draft_submissions: unknown };
  if (!Array.isArray(draft_submissions)) {
    return false;
  }
  return draft_submissions.length === 0 || 'org_id' in draft_submissions[0];
}

const isUsableAssessmentName = (name?: string | null): name is string => {
  return !!name && name.trim() !== '' && name !== 'Unknown Assessment';
};

const getSubmissionOrganizationId = (submission: OfflineDraftSubmission): string | undefined => {
  return submission.organization_id || (submission as OfflineDraftSubmission & { org_id?: string }).org_id;
};

const getReviewStatusRank = (status: OfflineDraftSubmission['review_status']): number => {
  switch (status) {
    case 'under_review':
      return 3;
    case 'pending_review':
      return 2;
    case 'draft':
      return 1;
    default:
      return 0;
  }
};

const getSyncStatusRank = (status: OfflineDraftSubmission['sync_status']): number => {
  switch (status) {
    case 'synced':
      return 2;
    case 'pending':
      return 1;
    default:
      return 0;
  }
};

const getSubmissionTimestamp = (submission: OfflineDraftSubmission): number => {
  const candidate = submission.updated_at || submission.submitted_at;
  const t = candidate ? Date.parse(candidate) : NaN;
  return Number.isFinite(t) ? t : 0;
};

export function useOfflineDraftSubmissions() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<{ draft_submissions: OfflineDraftSubmission[] }>({ draft_submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const currentOrganizationId = user?.organization || (
    user?.organizations
      ? user.organizations[Object.keys(user.organizations)[0]]?.id
      : undefined
  );

  const fetchData = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

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
          () => offlineDB.getAllDraftSubmissions().then(draft_submissions => ({ draft_submissions })),
          'drafts_endpoint'
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
        const adminSubmissions = onlineDraftsResult.draft_submissions;
        const allAssessments = await offlineDB.getAllAssessments();
        const assessmentsMap = new Map<string, string>(
          allAssessments.map(a => [a.assessment_id, a.name])
        );

        const offlineDrafts = (adminSubmissions as AdminSubmissionDetail[]).map(
          (submission) => {
            const apiAssessmentName = (submission as AdminSubmissionDetail & { assessment_name?: string }).assessment_name;
            return DataTransformationService.transformAdminSubmission(
              submission,
              isUsableAssessmentName(apiAssessmentName)
                ? apiAssessmentName
                : assessmentsMap.get(submission.assessment_id) || 'Unknown Assessment'
            );
          }
        );

        // Remove locally cached synced drafts that no longer exist on the server
        const localDrafts = await offlineDB.getAllDraftSubmissions();
        const onlineDraftIds = new Set(offlineDrafts.map(d => d.submission_id));
        const draftsToDelete = localDrafts.filter(d =>
          d.sync_status === 'synced' && !onlineDraftIds.has(d.submission_id)
        );

        await Promise.all([
          ...draftsToDelete.map(d => offlineDB.deleteDraftSubmission(d.submission_id)),
          offlineDB.saveDraftSubmissions(offlineDrafts as unknown as OfflineDraftSubmission[])
        ]);
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

      const visibleDrafts = localDrafts
        .filter((submission) => ['draft', 'pending_review', 'under_review'].includes(submission.review_status))
        .filter((submission) => {
          if (!currentOrganizationId) {
            return true;
          }

          return getSubmissionOrganizationId(submission) === currentOrganizationId;
        });

      // Dedupe drafts: keep a single best record per assessment_id
      // This prevents showing both a temporary offline draft and a server-synced draft.
      const draftsByAssessment = new Map<string, OfflineDraftSubmission[]>();
      for (const submission of visibleDrafts) {
        const key = submission.assessment_id || submission.submission_id;
        const list = draftsByAssessment.get(key) || [];
        list.push(submission);
        draftsByAssessment.set(key, list);
      }

      const dedupedDrafts: OfflineDraftSubmission[] = [];
      const duplicatesToDelete: string[] = [];

      for (const [, drafts] of draftsByAssessment) {
        if (drafts.length === 1) {
          dedupedDrafts.push(drafts[0]);
          continue;
        }

        const sorted = [...drafts].sort((a, b) => {
          const reviewRank = getReviewStatusRank(b.review_status) - getReviewStatusRank(a.review_status);
          if (reviewRank !== 0) return reviewRank;

          const syncRank = getSyncStatusRank(b.sync_status) - getSyncStatusRank(a.sync_status);
          if (syncRank !== 0) return syncRank;

          return getSubmissionTimestamp(b) - getSubmissionTimestamp(a);
        });

        const keep = sorted[0];
        dedupedDrafts.push(keep);
        for (const extra of sorted.slice(1)) {
          duplicatesToDelete.push(extra.submission_id);
        }
      }

      if (duplicatesToDelete.length > 0) {
        await Promise.all(
          duplicatesToDelete.map((id) => offlineDB.deleteDraftSubmission(id).catch(() => undefined))
        );
      }

      if (navigator.onLine) {
        const missingAssessmentIds = Array.from(new Set(
          visibleDrafts
            .filter((submission) => !isUsableAssessmentName(submission.assessment_name))
            .filter((submission) => submission.assessment_id && !assessmentsMap.has(submission.assessment_id))
            .map((submission) => submission.assessment_id)
        ));

        await Promise.all(missingAssessmentIds.map(async (assessmentId) => {
          try {
            const assessmentResult = await AssessmentsService.getAssessmentsByAssessmentId({ assessmentId });
            const assessment = assessmentResult.assessment;
            if (assessment?.assessment_id && assessment.name) {
              assessmentsMap.set(assessment.assessment_id, assessment.name);
              await offlineDB.saveAssessment(
                DataTransformationService.transformAssessment(assessment, categoryIdToCategoryMap)
              );
            }
          } catch (assessmentError) {
            console.warn(`Failed to enrich draft assessment name for ${assessmentId}:`, assessmentError);
          }
        }));
      }

      const submissions = dedupedDrafts.map((submission) => ({
        ...submission,
        assessment_name: isUsableAssessmentName(submission.assessment_name)
          ? submission.assessment_name
          : assessmentsMap.get(submission.assessment_id) || submission.assessment_name || 'Unknown Assessment'
      }));

      setData({ draft_submissions: submissions });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch draft submissions'));
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, currentOrganizationId]);

  useEffect(() => {
    fetchData();

    // Re-fetch when sync events fire (online mutations, queue flushes, etc.)
    const onDataSync = (e: Event) => {
      const { entityType } = (e as CustomEvent<{ entityType: string }>).detail || {};
      if (!entityType || entityType === 'submission' || entityType === 'draft_submission' || entityType === 'assessment') {
        fetchData();
      }
    };

    // Re-fetch when coming back online so stale data is refreshed immediately
    const onOnline = () => fetchData();

    // Re-fetch when the tab becomes visible (helps with cross-tab staleness)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    window.addEventListener('datasync', onDataSync);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('datasync', onDataSync);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
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
        // Instead of updating, we move it to the main submissions table and delete it from drafts
        const newSubmission: OfflineSubmission = {
          ...draft,
          review_status: 'under_review' as const, // It's now a regular submission under review
          sync_status: 'pending' as const,
          updated_at: new Date().toISOString(),
        };
        await offlineDB.saveSubmission(newSubmission);
        await offlineDB.deleteDraftSubmission(submissionId);
        console.log(`[Mutation] 4. Local mutation complete. Draft ${submissionId} moved to submissions and deleted from drafts.`);
      };

      const result = await apiInterceptor.interceptMutation(
        apiCall,
        localMutation,
        draft as unknown as Record<string, unknown>, // Pass the entire draft object as data for the sync queue
        'draft_submission', // Entity type is 'draft_submission' as it's still in that table
        'submit' // Operation is 'submit'
      );

      if (result && typeof result === 'object' && 'submission' in result) {
        const realSubmission = (result as { submission: Submission }).submission;
        await offlineDB.deleteDraftSubmission(submissionId);
        await offlineDB.deleteDraftSubmission(realSubmission.submission_id);

        const offlineSubmission = DataTransformationService.transformSubmission(realSubmission, draft.organization_id);
        offlineSubmission.review_status = 'under_review';
        offlineSubmission.assessment_name = isUsableAssessmentName(realSubmission.assessment_name)
          ? realSubmission.assessment_name
          : draft.assessment_name;
        offlineSubmission.organization_id = draft.organization_id;
        offlineSubmission.org_name = draft.org_name;
        await offlineDB.saveSubmission(offlineSubmission);
      }

      return result;
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
