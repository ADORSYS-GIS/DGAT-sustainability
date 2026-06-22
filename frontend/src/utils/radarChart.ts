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
  weight: z.number().optional(),  // snapshotted at report generation time
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
 * Returns both the raw score and the number of questions.
 */
function scoreCategoryQuestions(questions: { answer?: { percentage?: number; yesNo?: boolean } }[]): { score: number; count: number } {
  let score = 0;
  let count = 0;
  for (const q of questions) {
    count++;
    if (q.answer) {
      const pct = (q.answer.percentage ?? 0) / 100;
      const yes = q.answer.yesNo ? 1 : 0;
      score += pct * yes;
    }
  }
  return { score, count };
}

export const generateRadarChartData = (apiResponse: ReportData): RadarChartData | null => {
  const categories: { [key: string]: { score: number; count: number } } = {};

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

  if (report && report.data) {
    // First try the standard reportDataSchema path
    const parsedReportData = reportDataSchema.safeParse(report.data);

    if (parsedReportData.success) {
      parsedReportData.data.forEach((item) => {
        Object.entries(item).forEach(([categoryName, category]) => {
          const norm = normalizeCategoryName(categoryName);
          if (!categories[norm]) categories[norm] = { score: 0, count: 0 };

          const { score: rawScore, count: numQuestions } = scoreCategoryQuestions(category.questions);

          categories[norm].score += rawScore;
          categories[norm].count += numQuestions;
        });
      });
    } else {
      const merged = mergeReportCategoryData(report.data as Parameters<typeof mergeReportCategoryData>[0]);

      Object.entries(merged).forEach(([categoryName, categoryData]) => {
        const norm = normalizeCategoryName(categoryName);
        if (!categories[norm]) categories[norm] = { score: 0, count: 0 };

        const questions = Array.isArray((categoryData as { questions?: unknown[] })?.questions)
          ? ((categoryData as { questions: { answer?: { percentage?: number; yesNo?: boolean } }[] }).questions)
          : [];

        const { score: rawScore, count: numQuestions } = scoreCategoryQuestions(questions);

        categories[norm].score += rawScore;
        categories[norm].count += numQuestions;
      });
    }
  }

  const labels = Object.keys(categories);
  const sustainabilityScores = labels.map(label => {
    const data = categories[label];
    if (data.count === 0) return 0;
    const percentage = data.score / data.count;
    // Map the percentage directly against the MAX_RADAR_VALUE (which is 3)
    return parseFloat((percentage * MAX_RADAR_VALUE).toFixed(2));
  });

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
