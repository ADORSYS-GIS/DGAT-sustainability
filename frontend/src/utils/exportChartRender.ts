import { Chart, registerables } from "chart.js";
import type { ChartData, ChartOptions, Plugin } from "chart.js";
import type { RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { Report } from "@/openapi-rq/requests/types.gen";
import { generateRadarChartData } from "./radarChart";
import { generateRecommendationChartData } from "./recommendationChart";

Chart.register(...registerables);

function renderChartToDataUrl<TType extends "radar" | "bar">(
  type: TType,
  data: ChartData<TType>,
  options: ChartOptions<TType>,
  plugins: Plugin<TType>[] = [],
  width = 800,
  height = 480
): string | undefined {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const chart = new Chart(canvas, {
    type,
    data,
    options: {
      ...options,
      animation: false,
      responsive: false,
      maintainAspectRatio: false,
      devicePixelRatio: 2,
    } as ChartOptions<TType>,
    plugins,
  });

  chart.update("none");
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
          responsive: false,
          animation: false,
          maintainAspectRatio: false,
          scales: {
            r: {
              pointLabels: { font: { size: 14 } },
            },
          },
        } as ChartOptions<"radar">,
        [],
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
      recChartInfo.plugins,
      800,
      400
    );
  }

  return { radarChartDataUrl, recommendationChartDataUrl };
}
