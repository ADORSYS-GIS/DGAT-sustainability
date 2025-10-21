/**
 * @file services.ts
 * @description This file contains services for the Action Plan page.
 */
import { DetailedReport, OfflineRecommendation } from "@/types/offline";

export type KanbanRecommendation = OfflineRecommendation & {
  id: string;
  assessment_name?: string;
};

export const extractRecommendations = (
  reports: DetailedReport[]
): KanbanRecommendation[] => {
  const allRecommendations: KanbanRecommendation[] = [];

  if (!reports || !Array.isArray(reports)) {
    return allRecommendations;
  }

  reports.forEach((report) => {
    if (report.data && Array.isArray(report.data)) {
      report.data.forEach((categoryData) => {
        Object.keys(categoryData).forEach((category) => {
          const recommendations = categoryData[category]?.recommendations;
          if (recommendations && Array.isArray(recommendations)) {
            recommendations.forEach((rec) => {
              const recommendation_id = rec.id;
              if (rec.text !== "No recommendation provided") {
                allRecommendations.push({
                  recommendation_id: recommendation_id,
                  report_id: report.report_id,
                  category,
                  recommendation: rec.text,
                  status: rec.status,
                  id: recommendation_id, // For React key
                  assessment_name: (
                    report as DetailedReport & { assessment_name?: string }
                  ).assessment_name,
                } as KanbanRecommendation);
              }
            });
          }
        });
      });
    }
  });

  return allRecommendations;
};