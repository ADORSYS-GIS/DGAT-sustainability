import { mergeCategoryBuckets, normalizeCategoryName } from "./categoryUtils";
import type { ReportCategoryData, ReportRecommendation } from "@/types/offline";

export interface RecommendationFormValues {
  category: string;
  text: string;
}

/** Categories from report data where the user answered questions (assessment dimensions). */
export function extractAssessmentCategoriesFromReportData(
  data: ReportCategoryData[] | undefined | null
): string[] {
  if (!data || data.length === 0) return [];

  const merged = mergeCategoryBuckets(
    data.reduce<Record<string, ReportCategoryData[string]>>((acc, item) => {
      Object.entries(item).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {})
  );

  const categories = Object.entries(merged)
    .filter(([, content]) => {
      const questions = content?.questions;
      return Array.isArray(questions) && questions.length > 0;
    })
    .map(([name]) => normalizeCategoryName(name));

  return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
}

export function addRecommendationToReportData(
  data: ReportCategoryData[],
  values: RecommendationFormValues,
  recommendationId: string,
  status: ReportRecommendation["status"] = "todo"
): ReportCategoryData[] {
  const category = normalizeCategoryName(values.category);
  const text = values.text.trim();
  const newRec: ReportRecommendation = { id: recommendationId, text, status };

  const merged = mergeCategoryBuckets(
    data.reduce<Record<string, ReportCategoryData[string]>>((acc, item) => {
      Object.entries(item).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {})
  );

  const existing = merged[category] || { questions: [], recommendations: [] };
  merged[category] = {
    ...existing,
    recommendations: [...(existing.recommendations || []), newRec],
  };

  return Object.entries(merged).map(([key, value]) => ({ [key]: value }));
}

export function updateRecommendationInReportData(
  data: ReportCategoryData[],
  recommendationId: string,
  values: RecommendationFormValues
): ReportCategoryData[] {
  const newCategory = normalizeCategoryName(values.category);
  const newText = values.text.trim();

  let status: ReportRecommendation["status"] = "todo";
  let found = false;

  const merged = mergeCategoryBuckets(
    data.reduce<Record<string, ReportCategoryData[string]>>((acc, item) => {
      Object.entries(item).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {})
  );

  const updated: Record<string, ReportCategoryData[string]> = {};

  for (const [catName, content] of Object.entries(merged)) {
    const recs = (content.recommendations || []).filter((rec) => {
      if (rec.id === recommendationId) {
        status = rec.status;
        found = true;
        return false;
      }
      return true;
    });
    if (recs.length > 0 || (content.questions && content.questions.length > 0)) {
      updated[catName] = { ...content, recommendations: recs };
    } else if (content.questions?.length) {
      updated[catName] = { ...content, recommendations: [] };
    }
  }

  if (!found) {
    return data;
  }

  const target = updated[newCategory] || { questions: [], recommendations: [] };
  updated[newCategory] = {
    ...target,
    recommendations: [
      ...(target.recommendations || []),
      { id: recommendationId, text: newText, status },
    ],
  };

  return Object.entries(updated).map(([key, value]) => ({ [key]: value }));
}

export function deleteRecommendationFromReportData(
  data: ReportCategoryData[],
  recommendationId: string
): ReportCategoryData[] {
  const merged = mergeCategoryBuckets(
    data.reduce<Record<string, ReportCategoryData[string]>>((acc, item) => {
      Object.entries(item).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {})
  );

  for (const [catName, content] of Object.entries(merged)) {
    if (content.recommendations) {
      content.recommendations = content.recommendations.filter(
        (rec) => rec.id !== recommendationId
      );
      merged[catName] = content;
    }
  }

  return Object.entries(merged).map(([key, value]) => ({ [key]: value }));
}
