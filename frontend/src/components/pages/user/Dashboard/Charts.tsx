/**
 * @file Charts.tsx
 * @description This file defines the chart components for the Dashboard page.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { Radar, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { useTranslation } from "react-i18next";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

import { ChartData, ChartOptions } from "chart.js";

interface ChartsProps {
  radarChartData: ChartData<"radar">;
  recommendationChartInfo: {
    data: ChartData<"bar">;
    options: ChartOptions<"bar">;
  };
  chartRef: React.RefObject<ChartJS<"radar">>;
  recommendationChartRef: React.RefObject<ChartJS<"bar">>;
}

export const Charts: React.FC<ChartsProps> = ({
  radarChartData,
  recommendationChartInfo,
  chartRef,
  recommendationChartRef,
}) => {
  const { t } = useTranslation();

  const radarChartOptions = {
    maintainAspectRatio: false,
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 14,
          },
        },
      },
    },
  };

  return (
    <>
      {recommendationChartInfo && (
        <div
          style={{
            width: "800px",
            height: "400px",
            position: "absolute",
            zIndex: -1,
            opacity: 0,
          }}
        >
          <Bar
            ref={recommendationChartRef}
            data={recommendationChartInfo.data}
            options={recommendationChartInfo.options}
          />
        </div>
      )}
      {radarChartData && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>{t("user.dashboard.sustainabilityOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: "400px" }}>
                <Radar
                  ref={chartRef}
                  data={radarChartData}
                  options={radarChartOptions}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};