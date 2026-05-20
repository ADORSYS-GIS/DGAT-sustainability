import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { v5 as uuidv5 } from "uuid";
import { apiInterceptor } from "@/services/apiInterceptor";
import { offlineDB } from "@/services/indexeddb";
import { ReportsService } from "@/openapi-rq/requests/services.gen";
import {
  ReportsRecommendationApi,
  type RecommendationMutationResult,
} from "@/services/reportsRecommendationApi";
import { invalidateAndRefetch } from "@/hooks/useOfflineApi";
import { normalizeCategoryName } from "@/utils/categoryUtils";
import {
  addRecommendationToReportData,
  deleteRecommendationFromReportData,
  updateRecommendationInReportData,
  type RecommendationFormValues,
} from "@/utils/reportRecommendations";
import type { DetailedReport, OfflineRecommendation, ReportCategoryData } from "@/types/offline";

const RECOMMENDATION_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function generateRecommendationId(category: string, text: string): string {
  return uuidv5(`${normalizeCategoryName(category)}-${text.trim()}`, RECOMMENDATION_NAMESPACE);
}

async function persistReportLocally(
  report: DetailedReport,
  updatedData: ReportCategoryData[]
): Promise<void> {
  const reportToSave = {
    ...report,
    data: updatedData,
    updated_at: new Date().toISOString(),
    sync_status: "pending" as const,
    local_changes: true,
  };
  await offlineDB.saveReport(reportToSave);
}

async function syncRecommendationRecord(
  report: DetailedReport,
  mutation: RecommendationMutationResult,
  isDelete = false
): Promise<void> {
  if (isDelete) {
    await offlineDB.deleteRecommendation(mutation.recommendation_id);
    return;
  }

  const now = new Date().toISOString();
  const existing = await offlineDB.getRecommendation(mutation.recommendation_id);
  const record: OfflineRecommendation = {
    recommendation_id: mutation.recommendation_id,
    report_id: report.report_id,
    submission_id: report.submission_id,
    assessment_id: report.assessment_id,
    assessment_name: report.assessment_name || "Unknown Assessment",
    category: mutation.category,
    recommendation: mutation.recommendation,
    status: mutation.status as OfflineRecommendation["status"],
    created_at: existing?.created_at || now,
    updated_at: now,
    sync_status: "synced",
    local_changes: false,
    organization_id: existing?.organization_id,
    organization_name: existing?.organization_name,
  };
  await offlineDB.saveRecommendation(record);
}

export function useRecommendationMutations() {
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const invalidateCaches = useCallback(async () => {
    await invalidateAndRefetch(queryClient, [
      "user_recommendations",
      "admin_action_plans",
      "offlineActionPlans",
    ]);
  }, [queryClient]);

  const createRecommendation = useCallback(
    async (
      report: DetailedReport,
      values: RecommendationFormValues,
      options?: { onSuccess?: () => void; onError?: (err: Error) => void }
    ) => {
      const text = values.text.trim();
      const category = normalizeCategoryName(values.category);
      const recommendationId = generateRecommendationId(category, text);

      try {
        setIsPending(true);
        const updatedData = addRecommendationToReportData(
          report.data || [],
          { category, text },
          recommendationId,
          "todo"
        );
        await persistReportLocally(report, updatedData);

        const mutationResult: RecommendationMutationResult = {
          recommendation_id: recommendationId,
          category,
          recommendation: text,
          status: "todo",
        };

        await apiInterceptor.interceptMutation(
          () =>
            ReportsService.postSubmissionsBySubmissionIdReports({
              submissionId: report.submission_id,
              requestBody: [
                {
                  category,
                  recommendation: text,
                  status: "todo",
                },
              ],
            }),
          async () => {
            await syncRecommendationRecord(report, mutationResult);
          },
          mutationResult as unknown as Record<string, unknown>,
          "recommendations",
          "create"
        );

        await syncRecommendationRecord(report, mutationResult);
        await invalidateCaches();
        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create recommendation");
        options?.onError?.(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [invalidateCaches]
  );

  const updateRecommendation = useCallback(
    async (
      report: DetailedReport,
      recommendationId: string,
      values: RecommendationFormValues,
      options?: { onSuccess?: () => void; onError?: (err: Error) => void }
    ) => {
      const text = values.text.trim();
      const category = normalizeCategoryName(values.category);

      try {
        setIsPending(true);
        const updatedData = updateRecommendationInReportData(
          report.data || [],
          recommendationId,
          { category, text }
        );
        await persistReportLocally(report, updatedData);

        await apiInterceptor.interceptMutation(
          () =>
            ReportsRecommendationApi.updateRecommendation(report.report_id, recommendationId, {
              category,
              recommendation: text,
            }),
          async (response) => {
            await syncRecommendationRecord(report, response as RecommendationMutationResult);
          },
          {
            recommendation_id: recommendationId,
            category,
            recommendation: text,
          },
          "recommendations",
          "update"
        );

        const existing = await offlineDB.getRecommendation(recommendationId);
        if (existing) {
          await offlineDB.saveRecommendation({
            ...existing,
            category,
            recommendation: text,
            updated_at: new Date().toISOString(),
            sync_status: "synced",
          });
        }

        await invalidateCaches();
        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update recommendation");
        options?.onError?.(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [invalidateCaches]
  );

  const deleteRecommendation = useCallback(
    async (
      report: DetailedReport,
      recommendationId: string,
      options?: { onSuccess?: () => void; onError?: (err: Error) => void }
    ) => {
      try {
        setIsPending(true);
        const updatedData = deleteRecommendationFromReportData(
          report.data || [],
          recommendationId
        );
        await persistReportLocally(report, updatedData);

        await apiInterceptor.interceptMutation(
          () =>
            ReportsRecommendationApi.deleteRecommendation(
              report.report_id,
              recommendationId
            ),
          async () => {
            await offlineDB.deleteRecommendation(recommendationId);
          },
          { recommendation_id: recommendationId },
          "recommendations",
          "delete"
        );

        await offlineDB.deleteRecommendation(recommendationId);
        await invalidateCaches();
        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete recommendation");
        options?.onError?.(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [invalidateCaches]
  );

  return {
    createRecommendation,
    updateRecommendation,
    deleteRecommendation,
    isPending,
  };
}
