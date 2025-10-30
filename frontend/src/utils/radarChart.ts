import { z } from 'zod';
import type { Report } from "@/openapi-rq/requests/types.gen";

const answerSchema = z.object({
  percentage: z.number().optional(),
  yesNo: z.boolean().optional(),
});

const questionSchema = z.object({
  answer: answerSchema.optional(),
});

const categoryDataSchema = z.object({
  questions: z.array(questionSchema),
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

export const generateRadarChartData = (apiResponse: ReportData): RadarChartData => {
  const categories: { [key: string]: number } = {};
  const report = apiResponse.reports[apiResponse.reports.length - 1];
  const { organizationCategories } = apiResponse;

  if (report && report.data) {
    const parsedReportData = reportDataSchema.safeParse(report.data);

    if (parsedReportData.success) {
      parsedReportData.data.forEach((item) => {
        Object.entries(item).forEach(([categoryName, category]) => {
          if (!categories[categoryName]) {
            categories[categoryName] = 0;
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
            (orgCat) => orgCat.category_name === categoryName
          );
          const weight = orgCategory?.weight || 0;
          categories[categoryName] = sustainabilityScore * (weight / 100);
        });
      });
    } else {
      console.error("Invalid report data structure:", parsedReportData.error);
    }
  }

  const labels = Object.keys(categories);
  const sustainabilityScores = Object.values(categories);
  const maxRadarValue = 3;

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