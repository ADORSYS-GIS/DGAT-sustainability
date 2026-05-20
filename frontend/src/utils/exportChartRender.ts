import { Chart, registerables } from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import type { RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { Report } from "@/openapi-rq/requests/types.gen";
import { generateRadarChartData } from "./radarChart";
import { generateRecommendationChartData } from "./recommendationChart";

Chart.register(...registerables);

function renderChartToDataUrl(
  type: "radar" | "bar",
  data: ChartData<"radar"> | ChartData<"bar">,
  options: ChartOptions<"radar"> | ChartOptions<"bar">,
  width = 800,
  height = 480
): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const chart = new Chart(canvas, {
    type,
    data: data as ChartData<"radar">,
    options: options as ChartOptions<"radar">,
    plugins: type === "bar" ? (options as { plugins?: unknown[] }).plugins : undefined,
  });

  const url = canvas.toDataURL("image/png", 1);
  chart.destroy();
  return url;
}

export type ExportChartUrls = {
  radarChartDataUrl?: string;
  recommendationChartDataUrl?: string;
};

/**
 * Renders radar + recommendation status charts for a single report only (no cross-report mixing).
 */
export function buildExportChartUrlsForReport(
  report: Report,
  recommendations: RecommendationWithStatus[],
  organizationCategories?: { category_name: string; weight?: number }[]
): ExportChartUrls {
  let radarChartDataUrl: string | undefined;
  let recommendationChartDataUrl: string | undefined;

  if (organizationCategories?.length) {
    const radarInfo = generateRadarChartData({
      reports: [report],
      organizationCategories,
    });
    if (radarInfo) {
      radarChartDataUrl = renderChartToDataUrl(
        "radar",
        radarInfo as ChartData<"radar">,
        {
          maintainAspectRatio: false,
          scales: {
            r: {
              pointLabels: { font: { size: 14 } },
            },
          },
        } as ChartOptions<"radar">,
        800,
        500
      );
    }
  }

  const recChartInfo = generateRecommendationChartData(recommendations);
  if (recChartInfo) {
    recommendationChartDataUrl = renderChartToDataUrl(
      "bar",
      recChartInfo.data,
      recChartInfo.options as ChartOptions<"bar">,
      800,
      400
    );
  }

  return { radarChartDataUrl, recommendationChartDataUrl };
}
