import type { Report } from "@/openapi-rq/requests/types.gen";

interface ReportData {
  reports: Report[];
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

  if (report && report.data && Array.isArray(report.data)) {
    const reportData = report.data as { [key: string]: { questions: { answer?: { percentage?: number; yesNo?: boolean } }[] } }[];

    reportData.forEach((item) => {
      Object.keys(item).forEach((categoryName) => {
        if (!categories[categoryName]) {
          categories[categoryName] = 0;
        }

        const category = item[categoryName];
        let sustainabilityScore = 0;

        if (category && category.questions && Array.isArray(category.questions)) {
          category.questions.forEach((question) => {
            if (question.answer) {
              const percentage = (question.answer.percentage || 0) / 100;
              const yesNo = question.answer.yesNo ? 1 : 0;
              sustainabilityScore += percentage * yesNo;
            }
          });
        }

        categories[categoryName] = sustainabilityScore;
      });
    });
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