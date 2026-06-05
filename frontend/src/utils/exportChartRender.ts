import { Chart, registerables } from "chart.js";
import type { ChartData, ChartOptions, Plugin } from "chart.js";
import type { RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";
import type { Report } from "@/openapi-rq/requests/types.gen";
import { generateRadarChartData } from "./radarChart";
import { generateRecommendationChartData } from "./recommendationChart";

Chart.register(...registerables);

function wrapRadarLabel(label: string, maxLineLength = 20): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLineLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 4);
}

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
  // Must be attached to DOM for some browsers to render correctly
  canvas.style.position = "absolute";
  canvas.style.left = "-9999px";
  canvas.style.top = "-9999px";
  document.body.appendChild(canvas);

  try {
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
  } finally {
    document.body.removeChild(canvas);
  }
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
          layout: {
            padding: {
              top: 24,
              right: 88,
              bottom: 36,
              left: 88,
            },
          },
          plugins: {
            legend: {
              position: "top",
              align: "center",
              labels: {
                boxWidth: 34,
                padding: 18,
                font: { size: 13 },
              },
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 3,
              ticks: {
                stepSize: 0.5,
                backdropColor: "rgba(255, 255, 255, 0.75)",
                font: { size: 11 },
              },
              pointLabels: {
                callback: (label) => wrapRadarLabel(String(label)),
                padding: 18,
                font: { size: 12, weight: "bold" },
              },
            },
          },
        } as ChartOptions<"radar">,
        [],
        1000,
        650
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
