import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import {
  ReportsService,
  AdminService
} from "@/openapi-rq/requests/services.gen";
import type { 
  Report,
  ActionPlanListResponse,
  OrganizationActionPlan,
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineRecommendation,
  DetailedReport,
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";
import { useAuth } from "./shared/useAuth";
import { invalidateAndRefetch } from "./useOfflineApi";

export function useOfflineAdminActionPlans() {
  const [data, setData] = useState<ActionPlanListResponse>({ organizations: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        () => AdminService.getAdminActionPlans(),
        async () => {
          // Offline fallback: fetch all recommendations from IndexedDB
          const offlineRecommendations = await offlineDB.getAllRecommendations();

          // Group recommendations by organization to match ActionPlanListResponse structure
          const organizationsMap = new Map<string, OrganizationActionPlan>();

          offlineRecommendations.forEach(rec => {
            if (!organizationsMap.has(rec.organization_id)) {
              organizationsMap.set(rec.organization_id, {
                organization_id: rec.organization_id,
                organization_name: rec.organization_name,
                recommendations: [],
              });
            }
            organizationsMap.get(rec.organization_id)?.recommendations.push({
              recommendation_id: rec.recommendation_id,
              report_id: rec.report_id,
              category: rec.category,
              recommendation: rec.recommendation,
              status: rec.status,
              created_at: rec.created_at,
            });
          });

          return { organizations: Array.from(organizationsMap.values()) };
        },
        'admin_action_plans'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch admin action plans'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineReports() {
  const [data, setData] = useState<{ recommendations: OfflineRecommendation[]; reports: Report[] }>({ recommendations: [], reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth(); // Get current user for organization_id context

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          const reports = await ReportsService.getUserReports();
          // Transform reports into offline recommendations and save them
          const allOfflineRecommendations: OfflineRecommendation[] = [];
          for (const report of reports.reports) {
            const transformedRecs = DataTransformationService.transformReportToOfflineRecommendations(
              report as unknown as DetailedReport,
              user?.organization, // Access organization_id correctly
              user?.organization_name // Access organization_name correctly
            );
            allOfflineRecommendations.push(...transformedRecs);
          }
          await offlineDB.saveRecommendations(allOfflineRecommendations);
          return { recommendations: allOfflineRecommendations, reports: reports.reports }; // Return the transformed data and raw reports
        },
        async () => {
          // Offline fallback: fetch all recommendations from IndexedDB
          const offlineRecommendations = await offlineDB.getAllRecommendations();
          // Filter by user's organization_id if available, otherwise return all
          return {
            recommendations: user?.organization
              ? offlineRecommendations.filter(rec => rec.organization_id === user.organization)
              : offlineRecommendations,
            reports: [], // No raw reports available offline
          };
        },
        'user_recommendations'
      );

      setData(result as { recommendations: OfflineRecommendation[], reports: Report[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Re-run if user changes

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineUserRecommendations() {
  const [data, setData] = useState<{ reports: DetailedReport[] }>({ reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          const reportsResponse = await ReportsService.getUserReports();
          const reports = (reportsResponse.reports || []) as unknown as DetailedReport[];

          const allOfflineRecommendations: OfflineRecommendation[] = [];
          const submissions = await offlineDB.getAllSubmissions();
          const submissionMap = new Map(submissions.map(s => [s.submission_id, s.assessment_name]));

          const enrichedReports = reports.map(report => ({
            ...report,
            assessment_name: submissionMap.get(report.submission_id)
          }));

          for (const report of reports) {
            const assessmentName = submissionMap.get(report.submission_id);
            const transformedRecs = DataTransformationService.transformReportToOfflineRecommendations(
              report,
              user?.organization,
              user?.organization_name,
              assessmentName
            );
            allOfflineRecommendations.push(...transformedRecs);
          }
          await offlineDB.saveRecommendations(allOfflineRecommendations);
          
          return { reports: enrichedReports };
        },
        async () => {
          const [offlineRecommendations, submissions] = await Promise.all([
            offlineDB.getAllRecommendations(),
            offlineDB.getAllSubmissions(),
          ]);
          const submissionMap = new Map(submissions.map(s => [s.submission_id, s.assessment_name]));

          const userRecommendations = (user?.organization
            ? offlineRecommendations.filter(rec => rec.organization_id === user.organization)
            : offlineRecommendations
          ).map(rec => ({
            ...rec,
            assessment_name: submissionMap.get(rec.submission_id || '') || 'Unknown Assessment',
          }));

          const reportsMap = new Map<string, DetailedReport & { assessment_name?: string }>();

          for (const rec of userRecommendations) {
            if (!reportsMap.has(rec.report_id)) {
              reportsMap.set(rec.report_id, {
                report_id: rec.report_id,
                submission_id: rec.submission_id || '',
                assessment_name: rec.assessment_name,
                report_type: 'sustainability',
                status: 'completed',
                generated_at: new Date().toISOString(),
                data: [],
              });
            }
        
            const report = reportsMap.get(rec.report_id)!;
            
            let categoryObj = report.data.find(d => d[rec.category]);
            if (!categoryObj) {
              categoryObj = { [rec.category]: { recommendations: [] } };
              report.data.push(categoryObj);
            }
        
            const categoryContent = categoryObj[rec.category];
            if (categoryContent && categoryContent.recommendations) {
              categoryContent.recommendations.push({
                id: rec.recommendation_id,
                status: rec.status as "todo" | "in_progress" | "done" | "approved",
                text: rec.recommendation,
              });
            }
          }
          
          const reconstructedReports = Array.from(reportsMap.values());
          return { reports: reconstructedReports };
        },
        'user_recommendations'
      );
      setData(result as { reports: DetailedReport[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user recommendations'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}


export function useOfflineRecommendationStatusMutation() {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const updateRecommendationStatus = useCallback(async (
    reportId: string,
    category: string,
    recommendationId: string,
    newStatus: "todo" | "in_progress" | "done" | "approved", // Use literal union type
    options?: { onSuccess?: (data: Record<string, unknown>) => void; onError?: (err: Error) => void }
  ) => {
    try {
      setIsPending(true);

      // Optimistically update the local state first
      await offlineDB.updateRecommendationStatus(reportId, category, recommendationId, newStatus);
      
      // Invalidate relevant queries for immediate UI feedback
      await invalidateAndRefetch(queryClient, ['user_recommendations', 'admin_action_plans']);

      const result = await apiInterceptor.interceptMutation(
        () => ReportsService.putReportsByReportIdRecommendationsByRecommendationIdStatus({
          reportId: reportId,
          recommendationId: recommendationId,
          requestBody: {
            report_id: reportId,
            category: category,
            recommendation_id: recommendationId,
            status: newStatus,
          },
        }) as Promise<Record<string, unknown>>, // Cast to Promise<Record<string, unknown>>
        async (apiResponse: Record<string, unknown>) => {
          // If the API call succeeds, the status should already be updated in localDB by the optimistic update.
          // However, we should ensure the sync_status is set to 'synced' if not already.
          const updatedRecommendation = await offlineDB.getRecommendation(recommendationId);
          if (updatedRecommendation && updatedRecommendation.sync_status === 'pending') {
            await offlineDB.saveRecommendation({ ...updatedRecommendation, sync_status: 'synced' });
          }
        },
        { recommendation_id: recommendationId, report_id: reportId, category, status: newStatus } as Record<string, unknown>,
        'recommendations',
        'update'
      );

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update recommendation status');
      console.error('❌ updateRecommendationStatus error:', error);
      
      // Revert optimistic update on error if possible and desired
      const originalRecommendation = await offlineDB.getRecommendation(recommendationId);
      if (originalRecommendation) {
        // Here you might want to revert to the previous status or mark as 'failed'
        // For simplicity, we'll mark as failed. A robust solution might store original status.
        await offlineDB.saveRecommendation({ ...originalRecommendation, sync_status: 'failed' });
      }

      options?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [queryClient]);

  return { updateRecommendationStatus, isPending };
}