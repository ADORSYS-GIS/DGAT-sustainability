import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { OfflineSubmission, OfflineRecommendation, DetailedReport } from "@/types/offline";
import { useAuth } from "./shared/useAuth";
import { useOffline } from "./useOffline";
import { SubmissionsService, ReportsService } from "@/openapi-rq/requests/services.gen";
import { DataTransformationService } from "../services/dataTransformation";
import { apiInterceptor } from "../services/apiInterceptor";

export function useOfflineUserSubmissions(syncTrigger?: boolean) {
  const { user } = useAuth();
  const isOffline = useOffline();
  const [data, setData] = useState<{ submissions: OfflineSubmission[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let organizationId: string | undefined;

      if (user?.organizations) {
        const orgKeys = Object.keys(user.organizations);
        if (orgKeys.length > 0) {
          const orgData = (user.organizations as Record<string, { id: string }>)[orgKeys[0]];
          organizationId = orgData?.id;
        }
      }

      const organizationFallback = (user as any)?.organization;
      if (!organizationId && organizationFallback) {
        organizationId = organizationFallback;
      }

      if (!organizationId) {
        const orgs = await offlineDB.getAllOrganizations();
        if (orgs.length > 0) {
          organizationId = orgs[0].id;
        }
      }

      if (!organizationId) {
        setData({ submissions: [] });
        setIsLoading(false);
        return;
      }

      // Sync operation executed via interceptGet. The result isn't directly used
      // to render UI, it simply ensures the IndexedDB tables are updated first.
      await apiInterceptor.interceptGet(
        async () => {
          // 1. Fetch Submissions
          const submissionsData = await SubmissionsService.getSubmissions();
          if (submissionsData?.submissions) {
            const transformedSubmissions = DataTransformationService.transformSubmissionsWithContext(
              submissionsData.submissions,
              organizationId,
              user?.email
            );
            if (DataTransformationService.validateTransformedData(transformedSubmissions, 'submissions')) {
              // Inject organization_id properly prior to saving
              const submissionsToSave = transformedSubmissions.map(sub => ({
                ...sub,
                organization_id: organizationId
              }));
              await offlineDB.saveSubmissions(submissionsToSave as OfflineSubmission[]);
            }
          }

          // 2. Fetch Reports
          const reportsData = await ReportsService.getUserReports();
          if (reportsData?.reports) {
            const transformedReports = reportsData.reports.map(
              report => {
                const r = DataTransformationService.transformReport(report, organizationId, user?.sub);
                return { ...r, organization_id: organizationId }; // explicit injection
              }
            );

            if (DataTransformationService.validateTransformedData(transformedReports, "reports")) {
              await offlineDB.saveReports(transformedReports);

              // 3. Process Recommendations
              const allOfflineRecommendations: OfflineRecommendation[] = [];
              const allSubmissions = await offlineDB.getAllSubmissions();
              const submissionMap = new Map(allSubmissions.map((s) => [s.submission_id, s.assessment_name]));

              for (const report of transformedReports) {
                const assessmentName = submissionMap.get(report.submission_id);
                const transformedRecs = DataTransformationService.transformReportToOfflineRecommendations(
                  report as unknown as DetailedReport,
                  organizationId,
                  (user as any)?.organization_name,
                  assessmentName
                );
                allOfflineRecommendations.push(...transformedRecs);
              }

              if (allOfflineRecommendations.length > 0) {
                await offlineDB.saveRecommendations(allOfflineRecommendations);
              }
            }
          }
          return { success: true };
        },
        async () => {
          // Offline fallback is implicit since we immediately read from offlineDB below anyway.
          return { success: true, offline: true };
        },
        'user_action_plans_sync' // cache key for interceptor
      );

      // --- Read directly from updated Local Database to fulfill hook state ---

      // 1. Get all submissions and filter by user's org
      const allSubmissions = await offlineDB.getAllSubmissions();
      const userSubmissions = allSubmissions.filter(
        (submission) => submission.organization_id === organizationId
      );

      // 2. Get all recommendations and create a set of submission IDs
      const allRecommendations = await offlineDB.getAllRecommendations();
      const submissionIdsWithRecs = new Set(
        allRecommendations.map(rec => rec.submission_id).filter(id => id)
      );

      // 3. Filter submissions to only include those with recommendations
      const submissionsWithActionPlans = userSubmissions.filter(
        submission => submissionIdsWithRecs.has(submission.submission_id)
      );

      setData({ submissions: submissionsWithActionPlans });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch user submissions")
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, isOffline, syncTrigger]);

  return { data, isLoading, error, refetch: fetchData };
}