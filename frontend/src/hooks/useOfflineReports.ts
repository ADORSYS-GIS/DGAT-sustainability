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
  AdminReport,
  OrganizationActionPlan,
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineRecommendation,
  DetailedReport,
  ReportCategoryData,
  ReportCategoryContent,
  ReportRecommendation,
} from "@/types/offline";
import { DataTransformationService } from "../services/dataTransformation";
import { useAuth } from "./shared/useAuth";
import { invalidateAndRefetch } from "./useOfflineApi";


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

          const uiReports = reports.map(report => ({
            ...report,
            assessment_name: submissionMap.get(report.submission_id)
          }));

          const reportsToSave = uiReports.map(report => {
            const reportData: { [key: string]: { weight: number; questions: { answer: unknown; question: string }[]; recommendations: string[] } } = {};
            for (const item of (report.data || [])) {
              const key = Object.keys(item)[0];
              if (key) {
                const content = item[key] as ReportCategoryContent;
                reportData[key] = {
                  weight: 0,
                  questions: content?.questions || [],
                  recommendations: (content?.recommendations || []).map(rec => rec.text),
                };
              }
            }
        
            return {
              ...report,
              updated_at: new Date().toISOString(),
              sync_status: 'synced' as const,
              data: reportData,
            };
          });

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
          await offlineDB.saveReports(reportsToSave);
          
          return { reports: uiReports };
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
                assessment_id: rec.assessment_id,
                assessment_name: rec.assessment_name,
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
export function useOfflineAdminReports() {
  const [data, setData] = useState<{ reports: AdminReport[] }>({ reports: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          const response = await AdminService.getAdminReports();
          const reports = response.reports || [];
          const offlineReports = reports.map(DataTransformationService.transformAdminReport);
          await offlineDB.saveAdminReports(offlineReports);
          return { reports };
        },
        async () => {
          const reports = await offlineDB.getAllAdminReports();
          return { reports };
        },
        'admin_reports'
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch admin reports'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useOfflineReport(submissionId?: string) {
  const [data, setData] = useState<{ report: DetailedReport | null }>({ report: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!submissionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await apiInterceptor.interceptGet(
        async () => {
          // Online: Fetch all reports and find the specific one
          const response = await ReportsService.getUserReports();
          const reports = (response.reports || []) as unknown as DetailedReport[];
          const report = reports.find(r => r.submission_id === submissionId);
          
          if (report) {
            // Save the fetched report to IndexedDB
            const submissions = await offlineDB.getAllSubmissions();
            const submissionMap = new Map(submissions.map(s => [s.submission_id, s.assessment_name]));
            const assessmentName = submissionMap.get(report.submission_id) || 'Unknown Assessment';

            const reportToSave = {
              ...report,
              assessment_name: assessmentName,
              updated_at: new Date().toISOString(),
              sync_status: 'synced' as const,
              data: (() => {
                const reportData: { [key: string]: { weight: number; questions: { answer: unknown; question: string }[]; recommendations: string[] } } = {};
                for (const item of (report.data || [])) {
                  const key = Object.keys(item)[0];
                  if (key) {
                    const content = item[key] as ReportCategoryContent;
                    reportData[key] = {
                      weight: 0,
                      questions: content?.questions || [],
                      recommendations: (content?.recommendations || []).map(rec => rec.text),
                    };
                  }
                }
                return reportData;
              })(),
            };
            await offlineDB.saveReports([reportToSave]);
            return { report };
          }
          return { report: null };
        },
        async () => {
          // Offline: Fetch from IndexedDB
          const allReports = await offlineDB.getAllReports();
          const report = allReports.find(r => r.submission_id === submissionId);

          if (report) {
            const submissions = await offlineDB.getAllSubmissions();
            const submission = submissions.find(s => s.submission_id === submissionId);
            const assessmentName = submission?.assessment_name || 'Unknown Assessment';

            // Fetch recommendations for this report
            const recommendations = await offlineDB.getRecommendationsByReportId(report.report_id);

            // Group recommendations by category
            const recommendationsByCategory: { [key: string]: ReportRecommendation[] } = {};
            for (const rec of recommendations) {
              if (!recommendationsByCategory[rec.category]) {
                recommendationsByCategory[rec.category] = [];
              }
              recommendationsByCategory[rec.category].push({
                id: rec.recommendation_id,
                status: rec.status as "todo" | "in_progress" | "done" | "approved",
                text: rec.recommendation,
              });
            }

            // Transform into the structure expected by DetailedReport['data']
            const transformedData: ReportCategoryData[] = Object.entries(recommendationsByCategory).map(
              ([category, recs]) => ({
                [category]: {
                  recommendations: recs,
                },
              })
            );

            const enrichedReport = {
              ...report,
              assessment_name: assessmentName,
              data: transformedData,
            };
            return { report: enrichedReport as unknown as DetailedReport };
          }
          return { report: null };
        },
        `report_${submissionId}`
      );

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch report'));
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}