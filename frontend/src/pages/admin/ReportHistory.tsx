// /frontend/src/pages/admin/ReportHistory.tsx
/**
 * @file Page for viewing and managing report history.
 * @description This page allows administrators to view, filter, and download reports for all organizations.
 */
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { useOfflineAdminReports } from "@/hooks/useOfflineReports";
import type {
  AdminReport,
  AdminSubmissionDetail,
  AdminSubmissionDetail_content_responses,
  RecommendationWithStatus,
  Report
} from "@/openapi-rq/requests/types.gen";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { FileText, RefreshCw } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { Bar, Radar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import OrganizationSelector from "@/components/pages/admin/ReportHistory/OrganizationSelector";
import ReportCard from "@/components/pages/admin/ReportHistory/ReportCard";
import ReportDetailModal from "@/components/pages/admin/ReportHistory/ReportDetailModal";

export const ReportHistory: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    isLoading: loading,
    error,
    refetch: loadReports,
  } = useOfflineAdminReports();
  const reports = (data?.reports as AdminReport[]) || [];
  const chartRef = React.useRef<ChartJS<"radar">>(null);
  const recommendationChartRef = React.useRef<ChartJS<"bar">>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);

  React.useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("reportHistory.loadError"));
    }
  }, [error, t]);

  const filteredReports = reports.filter(report => {
    const matchesOrg = !selectedOrgId || report.org_id === selectedOrgId;
    return matchesOrg;
  });

  const handleDownloadReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.report_id === reportId);
      if (!report || !report.data) throw new Error('No data available for this report');

      const reportToExport: Report = {
        ...report,
        report_type: "sustainability",
        status: report.status as "completed" | "generating" | "failed",
      };
      const { submissions, recommendations } = mapReportToExportInputs(reportToExport);

      const radarChartDataUrl = chartRef.current?.toBase64Image();
      const recommendationChartDataUrl = recommendationChartRef.current?.toBase64Image();

      await exportAllAssessmentsPDF(
        submissions,
        recommendations,
        radarChartDataUrl,
        recommendationChartDataUrl
      );
      toast.success(t('reportHistory.downloadSuccess'));
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error(t('reportHistory.downloadError'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t('reportHistory.title')}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('reportHistory.subtitle')}
                </p>
              </div>
              <Button
                onClick={loadReports}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('reportHistory.refresh')}</span>
              </Button>
            </div>
          </div>
          <OrganizationSelector
            reports={reports}
            selectedOrgId={selectedOrgId}
            onSelectOrg={setSelectedOrgId}
          />
          <div className="grid gap-6">
            {selectedOrgId && filteredReports.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                {t('reportHistory.noReports')}
              </div>
            )}
            {selectedOrgId && filteredReports.map((report, index) => (
              <ReportCard
                key={report.report_id}
                report={report}
                onView={setViewReportId}
                onDownload={handleDownloadReport}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
      <ReportDetailModal
        report={reports.find(r => r.report_id === viewReportId)}
        isOpen={!!viewReportId}
        onClose={() => setViewReportId(null)}
        onDownload={handleDownloadReport}
      />
    </div>
  );
};

const mapReportToExportInputs = (
  report: Report
): { submissions: AdminSubmissionDetail[]; recommendations: RecommendationWithStatus[] } => {
  type ReportDataCategory = {
    questions?: { question?: string; answer?: unknown }[];
    recommendations?: { id: string; text: string; status: string }[];
  };

  const categoriesObj: Record<string, ReportDataCategory> =
    Array.isArray(report.data) && report.data.length > 0
      ? (report.data[0] as Record<string, ReportDataCategory>)
      : {};

  const responses = Object.entries(categoriesObj).flatMap(
    ([category, categoryData]) => {
      const questions = Array.isArray(categoryData?.questions)
        ? categoryData.questions!
        : [];
      return questions.map((q) => ({
        question_category: category,
        question_text: q?.question ?? "",
        response: JSON.stringify(q?.answer ?? {}),
      }));
    }
  );

  const submissions: AdminSubmissionDetail[] = [
    {
      submission_id: report.report_id,
      assessment_id: '',
      user_id: '',
      org_id: '',
      org_name: '',
      content: {
        assessment: { assessment_id: '' },
        responses: responses as AdminSubmissionDetail_content_responses[],
      },
      // The type definition seems to be missing 'reviewed', but it's a valid status from the API.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      review_status: "reviewed" as any,
      submitted_at: report.generated_at,
      reviewed_at: report.generated_at,
    },
  ];

  const recommendations: RecommendationWithStatus[] = Object.entries(categoriesObj).flatMap(
    ([category, categoryData]) => {
      const categoryRecommendations = Array.isArray(categoryData?.recommendations)
        ? categoryData.recommendations
        : [];
      return categoryRecommendations.map((rec) => ({
        recommendation_id: rec.id,
        report_id: report.report_id,
        category,
        recommendation: rec.text,
        status: (rec.status as RecommendationWithStatus["status"]) || "todo",
        created_at: report.generated_at,
      }));
    }
  );

  return { submissions, recommendations };
};
