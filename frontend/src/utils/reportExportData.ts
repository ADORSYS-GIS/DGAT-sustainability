import type { AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { ReportCategoryData } from "@/types/offline";
import { mergeCategoryBuckets, normalizeCategoryName } from "./categoryUtils";
import { serializeAnswerForExport } from "./parseAssessmentAnswer";

export type ReportLike = {
  report_id: string;
  submission_id: string;
  assessment_id?: string;
  assessment_name?: string;
  generated_at: string;
  data?: ReportCategoryData[] | unknown;
};

/**
 * Merges every category bucket in report.data for a single report.
 * (Backend stores one report as [{ "Category A": {...}, "Category B": {...} }]
 * or occasionally multiple array entries — all belong to the same report.)
 */
export function mergeReportCategoryData(
  data: ReportCategoryData[] | unknown | null | undefined
): Record<string, ReportCategoryData[string]> {
  if (data == null) {
    return {};
  }

  const items: Record<string, ReportCategoryData[string]>[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        items.push(item as Record<string, ReportCategoryData[string]>);
      }
    }
  } else if (typeof data === "object") {
    const maybe = data as Record<string, unknown>;
    if (Array.isArray(maybe.submissions) && Array.isArray(maybe.recommendations)) {
      return {};
    }
    items.push(data as Record<string, ReportCategoryData[string]>);
  }

  if (items.length === 0) {
    return {};
  }

  return items.reduce(
    (merged, item) => mergeCategoryBuckets({ ...merged, ...item }),
    {} as Record<string, ReportCategoryData[string]>
  );
}

export function filterRecommendationsForReport(
  recommendations: RecommendationWithStatus[],
  reportId: string
): RecommendationWithStatus[] {
  return recommendations.filter((rec) => rec.report_id === reportId);
}

export function deduplicateRecommendations(
  recommendations: RecommendationWithStatus[]
): RecommendationWithStatus[] {
  const deduplicatedMap = new Map<string, RecommendationWithStatus>();

  recommendations.forEach((rec) => {
    const normalizedCategory = normalizeCategoryName(rec.category).toLowerCase();
    const key = `${rec.report_id}::${normalizedCategory}::${rec.recommendation.toLowerCase().trim()}`;

    if (
      !deduplicatedMap.has(key) ||
      new Date(rec.created_at) > new Date(deduplicatedMap.get(key)!.created_at)
    ) {
      deduplicatedMap.set(key, rec);
    }
  });

  return Array.from(deduplicatedMap.values());
}

export type ReportExportPayload = {
  submissions: AdminSubmissionDetail[];
  recommendations: RecommendationWithStatus[];
};

/**
 * Builds PDF/DOCX export inputs from one report only — never mixes other reports or submissions.
 */
export function buildExportPayloadFromReport(report: ReportLike): ReportExportPayload {
  const categoriesObj = mergeReportCategoryData(report.data as ReportCategoryData[]);

  const responses = Object.entries(categoriesObj).flatMap(([category, categoryData]) => {
    const questions = Array.isArray(categoryData?.questions) ? categoryData.questions! : [];
    return questions.map(
      (q): { question_category: string; question_text: string; response: string } => ({
        question_category: normalizeCategoryName(category),
        question_text: q?.question ?? "",
        response: serializeAnswerForExport(q?.answer),
      })
    );
  });

  const submissions: AdminSubmissionDetail[] = [
    {
      submission_id: report.submission_id,
      assessment_id: report.assessment_id ?? "",
      user_id: "",
      org_id: "",
      org_name: "",
      content: {
        assessment: { assessment_id: report.assessment_id ?? "" },
        responses,
      },
      review_status: "reviewed",
      submitted_at: report.generated_at,
      reviewed_at: report.generated_at,
    } as unknown as AdminSubmissionDetail,
  ];

  const recommendations: RecommendationWithStatus[] = Object.entries(categoriesObj).flatMap(
    ([category, categoryData]) => {
      const categoryRecommendations = Array.isArray(categoryData?.recommendations)
        ? categoryData.recommendations
        : [];
      return categoryRecommendations
        .filter(
          (rec) =>
            rec.text !== "No recommendation provided" && rec.text !== "No action plan given"
        )
        .map(
          (rec): RecommendationWithStatus => ({
            recommendation_id: rec.id,
            report_id: report.report_id,
            assessment_id: report.assessment_id ?? "",
            assessment_name: report.assessment_name ?? "Unknown Assessment",
            category: normalizeCategoryName(category),
            recommendation: rec.text,
            status: (rec.status as RecommendationWithStatus["status"]) || "todo",
            created_at: report.generated_at,
          })
        );
    }
  );

  return {
    submissions,
    recommendations: deduplicateRecommendations(
      filterRecommendationsForReport(recommendations, report.report_id)
    ),
  };
}

/** Admin legacy shape: scope embedded arrays to this report only. */
export function buildExportPayloadFromAdminReportData(
  report: ReportLike,
  adminData: {
    submissions: AdminSubmissionDetail[];
    recommendations: RecommendationWithStatus[];
  }
): ReportExportPayload {
  const submissions = adminData.submissions.filter(
    (s) => s.submission_id === report.submission_id
  );
  const scopedSubmissions =
    submissions.length > 0
      ? submissions.slice(0, 1)
      : buildExportPayloadFromReport(report).submissions;

  const recommendations = deduplicateRecommendations(
    filterRecommendationsForReport(adminData.recommendations, report.report_id)
  );

  return {
    submissions: scopedSubmissions,
    recommendations:
      recommendations.length > 0
        ? recommendations
        : buildExportPayloadFromReport(report).recommendations,
  };
}
