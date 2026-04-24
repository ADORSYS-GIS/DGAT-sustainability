import type { ChartData, ChartOptions } from "chart.js";
import type { RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";

export const generateRecommendationChartData = (
  recommendations: RecommendationWithStatus[]
): { data: ChartData<"bar">; options: ChartOptions<"bar">; plugins?: any[] } | null => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const statusCounts = {
    todo: 0,
    in_progress: 0,
    done: 0,
    approved: 0,
  };

  recommendations.forEach((rec) => {
    if (rec.status) {
      statusCounts[rec.status]++;
    }
  });

  const total = recommendations.length;
  const percentages = {
    todo: (statusCounts.todo / total) * 100,
    in_progress: (statusCounts.in_progress / total) * 100,
    done: (statusCounts.done + statusCounts.approved) / total * 100,
  };

  // Custom plugin to display percentage values on bars
  const percentagePlugin = {
    id: 'percentageLabels',
    afterDatasetsDraw: (chart: any) => {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar: any, index: number) => {
          const value = dataset.data[index];
          const percentage = Math.round(value);
          
          if (percentage > 0) { // Only show percentage if greater than 0
            // Set font style
            ctx.fillStyle = '#374151';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            // Position text above the bar
            const x = bar.x;
            const y = bar.y - 8;
            
            // Draw the percentage text
            ctx.fillText(percentage + '%', x, y);
          }
        });
      });
    }
  };

  const data: ChartData<"bar"> = {
    labels: ["To Do", "In Progress", "Done"],
    datasets: [
      {
        label: "Recommendation Status (%)",
        data: [percentages.todo, percentages.in_progress, percentages.done],
        backgroundColor: [
          "rgba(255, 159, 64, 0.2)", // orange
          "rgba(75, 192, 192, 0.2)", // green
          "rgba(54, 162, 235, 0.2)", // blue
        ],
        borderColor: [
          "rgba(255, 159, 64, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(54, 162, 235, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Recommendation Status Overview",
        font: {
          size: 18,
          weight: "bold",
        },
      },
      // Register our custom plugin
      percentageLabels: {},
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
  };

  return { data, options, plugins: [percentagePlugin] };
};