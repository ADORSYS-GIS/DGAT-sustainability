import { z } from 'zod';
import type { Report } from "@/openapi-rq/requests/types.gen";
import { normalizeCategoryName } from "./categoryUtils";

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

export const generateRadarChartData = (apiResponse: ReportData): RadarChartData | null => {
  const categories: { [key: string]: number } = {};
  
  // Check if there are any reports
  if (!apiResponse.reports || apiResponse.reports.length === 0) {
    return null;
  }
  
  // Find the most recent report by generated_at date instead of using array position
  // If timestamps are identical, use report_id as tiebreaker (assuming newer reports have newer IDs)
  const report = apiResponse.reports.reduce((latest, current) => {
    const latestDate = new Date(latest.generated_at);
    const currentDate = new Date(current.generated_at);
    
    if (currentDate > latestDate) {
      return current;
    } else if (currentDate.getTime() === latestDate.getTime()) {
      // If timestamps are identical, use report_id as tiebreaker
      return current.report_id > latest.report_id ? current : latest;
    } else {
      return latest;
    }
  });
  
  const { organizationCategories } = apiResponse;

  if (report && report.data) {
    const parsedReportData = reportDataSchema.safeParse(report.data);

    if (parsedReportData.success) {
      parsedReportData.data.forEach((item) => {
        Object.entries(item).forEach(([categoryName, category]) => {
          const normalizedCategoryName = normalizeCategoryName(categoryName);

          if (!categories[normalizedCategoryName]) {
            categories[normalizedCategoryName] = 0;
          }

          let sustainabilityScore = 0;

          category.questions.forEach((question) => {
            if (question.answer) {
              const percentage = (question.answer.percentage || 0) / 100;
              const yesNo = question.answer.yesNo ? 1 : 0;
              sustainabilityScore += percentage * yesNo;
            }
          });

          const orgCategory = organizationCategories.find(
            (orgCat) => normalizeCategoryName(orgCat.category_name) === normalizedCategoryName
          );
          const weight = orgCategory?.weight || 0;
          categories[normalizedCategoryName] += sustainabilityScore * (weight / 100);
        });
      });
    } else {
      console.error("Invalid report data structure:", parsedReportData.error);
    }
  }

  const labels = Object.keys(categories);
  const sustainabilityScores = Object.values(categories);
  const maxRadarValue = 3;

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
        data: labels.map(() => maxRadarValue),
        backgroundColor: 'rgba(255, 167, 38, 0.2)',
        borderColor: 'rgba(255, 167, 38, 1)',
        borderWidth: 1,
      },
    ],
  };
};
