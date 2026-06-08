import { z } from 'zod';
import type { Report } from "@/openapi-rq/requests/types.gen";
import { normalizeCategoryName } from "./categoryUtils";
import { mergeReportCategoryData } from "./reportExportData";

const answerSchema = z.object({
  percentage: z.number().optional(),
  yesNo: z.boolean().optional(),
});

const questionSchema = z.object({
  answer: answerSchema.optional(),
});

const categoryDataSchema = z.object({
  questions: z.array(questionSchema).optional().default([]),
  weight: z.number().optional(),
});

const reportDataSchema = z.array(z.record(z.string(), categoryDataSchema));

interface ReportData {
  reports: Report[];
  organizationCategories: {
    category_name: string;
    weight?: number;
  }[];
}

interface RadarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}

const MAX_RADAR_VALUE = 3;

/**
 * Scores one category bucket — counts (yesNo * percentage/100) per question.
 */
function scoreCategoryQuestions(questions: { answer?: { percentage?: number; yesNo?: boolean } }[]): number {
  let score = 0;
  for (const q of questions) {
    if (q.answer) {
      const pct = (q.answer.percentage ?? 0) / 100;
      const yes = q.answer.yesNo ? 1 : 0;
      score += pct * yes;
    }
  }
  return score;
}

export const generateRadarChartData = (apiResponse: ReportData): RadarChartData | null => {
  const categories: { [key: string]: number } = {};

  if (!apiResponse.reports || apiResponse.reports.length === 0) {
    return null;
  }

  const report = apiResponse.reports.reduce((latest, current) => {
    const latestDate = new Date(latest.generated_at);
    const currentDate = new Date(current.generated_at);
    if (currentDate > latestDate) return current;
    if (currentDate.getTime() === latestDate.getTime()) {
      return current.report_id > latest.report_id ? current : latest;
    }
    return latest;
  });

  const { organizationCategories } = apiResponse;

  if (report && report.data) {
    // First try the standard reportDataSchema path
    const parsedReportData = reportDataSchema.safeParse(report.data);

    if (parsedReportData.success) {
      parsedReportData.data.forEach((item) => {
        Object.entries(item).forEach(([categoryName, category]) => {
          const norm = normalizeCategoryName(categoryName);
          if (!categories[norm]) categories[norm] = 0;

          const rawScore = scoreCategoryQuestions(category.questions);

          const orgCategory = organizationCategories.find(
            (c) => normalizeCategoryName(c.category_name) === norm
          );
          const weight = orgCategory?.weight ?? 100;
          categories[norm] += rawScore * (weight / 100);
        });
      });
    } else {
      const merged = mergeReportCategoryData(report.data as Parameters<typeof mergeReportCategoryData>[0]);
      Object.entries(merged).forEach(([categoryName, categoryData]) => {
        const norm = normalizeCategoryName(categoryName);
        if (!categories[norm]) categories[norm] = 0;

        const questions = Array.isArray((categoryData as { questions?: unknown[] })?.questions)
          ? ((categoryData as { questions: { answer?: { percentage?: number; yesNo?: boolean } }[] }).questions)
          : [];

        const rawScore = scoreCategoryQuestions(questions);

        const orgCategory = organizationCategories.find(
          (c) => normalizeCategoryName(c.category_name) === norm
        );
        const weight = orgCategory?.weight ?? 100;
        categories[norm] += rawScore * (weight / 100);
      });
    }
  }

  const labels = Object.keys(categories);
  const sustainabilityScores = Object.values(categories);

  if (labels.length === 0) {
    return null;
  }

  return {
    labels,
    datasets: [
      {
        label: 'Sustainability Score',
        data: sustainabilityScores,
        backgroundColor: 'rgba(66, 165, 245, 0.2)',
        borderColor: 'rgba(66, 165, 245, 1)',
        borderWidth: 1,
      },
      {
        label: 'Maximum Score per Section',
        data: labels.map(() => MAX_RADAR_VALUE),
        backgroundColor: 'rgba(255, 167, 38, 0.2)',
        borderColor: 'rgba(255, 167, 38, 1)',
        borderWidth: 1,
      },
    ],
  };
};
