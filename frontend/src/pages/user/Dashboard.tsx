/**
 * @file Dashboard.tsx
 * @description This file defines the main Dashboard page, which serves as the central hub for users.
 */
import { ReportSelectionDialog } from "@/components/shared/ReportSelectionDialog";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineAdminSubmissions } from "@/hooks/useOfflineAdminSubmissions";
import { useOfflineAssessments } from "@/hooks/useOfflineAssessments";
import {
  useOfflineReports,
  useOfflineUserRecommendations,
} from "@/hooks/useOfflineReports";
import { useOfflineSubmissions } from "@/hooks/useOfflineSubmissions";
import {
  AdminSubmissionDetail,
  RecommendationWithStatus,
  Report,
  Submission,
} from "@/openapi-rq/requests/types.gen";
import { exportAllAssessmentsDOCX } from "@/utils/exportDOCX";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
import { generateRadarChartData } from "@/utils/radarChart";
import { generateRecommendationChartData } from "@/utils/recommendationChart";
import * as React from "react";
import { Chart as ChartJS } from "chart.js";
import { DashboardActions } from "@/components/pages/user/Dashboard/DashboardActions";
import { DashboardHeader } from "@/components/pages/user/Dashboard/DashboardHeader";
import { RecentSubmissions } from "@/components/pages/user/Dashboard/RecentSubmissions";
import { DashboardSidebar } from "@/components/pages/user/Dashboard/DashboardSidebar";
import { Charts } from "@/components/pages/user/Dashboard/Charts";

// Local types to map report.data into existing export inputs
interface ReportAnswer {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
}
interface ReportQuestionItem {
  question?: string;
  answer?: ReportAnswer;
}
interface ReportCategoryData {
  questions?: ReportQuestionItem[];
  recommendations?: {
    id: string;
    text: string;
    status: "todo" | "in_progress" | "done" | "approved" | string;
  }[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const chartRef = React.useRef<ChartJS<"radar">>(null);
  const recommendationChartRef = React.useRef<ChartJS<"bar">>(null);

  const { data: userSubmissionsData, isLoading: userSubmissionsLoading } =
    useOfflineSubmissions();
  const { data: adminSubmissionsData } = useOfflineAdminSubmissions();
  const { data: reportsData, isLoading: reportsLoading } = useOfflineReports();
  const { data: assessmentsData } = useOfflineAssessments();
  const { data: userRecommendations } = useOfflineUserRecommendations();

  const submissions: Submission[] =
    userSubmissionsData?.submissions?.slice(0, 5) || [];
  const [isReportDialogOpen, setIsReportDialogOpen] = React.useState(false);
  const [exportType, setExportType] = React.useState<"pdf" | "docx">("pdf");

  const handleOpenReportDialog = (type: "pdf" | "docx") => {
    setExportType(type);
    setIsReportDialogOpen(true);
  };

  const mapReportToExportInputs = (
    report: Report
  ): {
    submissions: AdminSubmissionDetail[];
    recommendations: RecommendationWithStatus[];
  } => {
    const categoriesObj: Record<string, ReportCategoryData> =
      Array.isArray(report.data) && report.data.length > 0
        ? (report.data[0] as unknown as Record<string, ReportCategoryData>)
        : {};

    const responses = Object.entries(categoriesObj).flatMap(
      ([category, categoryData]) => {
        const questions = Array.isArray(categoryData?.questions)
          ? categoryData.questions!
          : [];
        return questions.map(
          (q): {
            question_category: string;
            question_text: string;
            response: string;
          } => ({
            question_category: category,
            question_text: q?.question ?? "",
            response: JSON.stringify(q?.answer ?? {}),
          })
        );
      }
    );

    const submissions: AdminSubmissionDetail[] = [
      ({
        submission_id: report.submission_id,
        assessment_id: "",
        user_id: "",
        org_id: "",
        org_name: "",
        content: {
          assessment: { assessment_id: "" },
          responses,
        },
        review_status: "reviewed",
        submitted_at: report.generated_at,
        reviewed_at: report.generated_at,
      } as unknown) as AdminSubmissionDetail,
    ];

    const recommendations: RecommendationWithStatus[] = Object.entries(
      categoriesObj
    ).flatMap(([category, categoryData]) => {
      const categoryRecommendations = Array.isArray(
        categoryData?.recommendations
      )
        ? categoryData.recommendations
        : [];
      return categoryRecommendations.map((rec) => ({
        recommendation_id: rec.id,
        report_id: report.report_id,
        category,
        recommendation: rec.text,
        status:
          (rec.status as RecommendationWithStatus["status"]) || "todo",
        created_at: report.generated_at,
      }));
    });

    return { submissions, recommendations };
  };

  const handleSelectReportToExport = async (report: { report_id: string }) => {
    try {
      const fullReport = reportsData?.reports?.find(
        (r) => r.report_id === report.report_id
      );
      if (!fullReport) return;

      const {
        submissions: singleSubmissions,
        recommendations: singleRecs,
      } = mapReportToExportInputs(fullReport as Report);

      const radarChartDataUrl = chartRef.current?.toBase64Image();
      const recommendationChartDataUrl =
        recommendationChartRef.current?.toBase64Image();

      if (exportType === "pdf") {
        await exportAllAssessmentsPDF(
          singleSubmissions,
          singleRecs,
          radarChartDataUrl,
          recommendationChartDataUrl
        );
      } else {
        await exportAllAssessmentsDOCX(
          singleSubmissions,
          singleRecs,
          radarChartDataUrl,
          recommendationChartDataUrl
        );
      }
    } finally {
      setIsReportDialogOpen(false);
    }
  };

  const userName =
    user?.name || user?.preferred_username || user?.email || "User";
  let orgName = "Organization";

  if (user?.organizations && typeof user.organizations === "object") {
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length > 0) {
      orgName = orgKeys[0];
    }
  }

  const radarChartData = React.useMemo(() => {
    if (reportsData?.reports) {
      return generateRadarChartData({ reports: reportsData.reports });
    }
    return null;
  }, [reportsData]);

  const recommendationChartInfo = React.useMemo(() => {
    if (userRecommendations?.reports) {
      const allRecommendations = userRecommendations.reports.flatMap(
        (report) => {
          const categoriesObj =
            Array.isArray(report.data) && report.data.length > 0
              ? report.data[0]
              : {};
          return Object.values(
            categoriesObj as Record<
              string,
              { recommendations: { id: string; text: string; status: string }[] }
            >
          ).flatMap((category) =>
            (category.recommendations || []).map((r) => ({
              ...r,
              report_id: report.report_id,
              created_at: report.generated_at,
            }))
          );
        }
      );
      return generateRecommendationChartData(
        allRecommendations.map((r) => ({
          ...r,
          recommendation_id: r.id,
          recommendation: r.text,
          category: "",
          status: r.status as RecommendationWithStatus["status"],
        }))
      );
    }
    return null;
  }, [userRecommendations]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardHeader userName={userName} orgName={orgName} />
          <DashboardActions user={user} />

          <div className="grid lg:grid-cols-3 gap-8">
            <RecentSubmissions
              submissions={submissions}
              isLoading={userSubmissionsLoading}
            />
            <DashboardSidebar
              onExportPDF={() => handleOpenReportDialog("pdf")}
              onExportDOCX={() => handleOpenReportDialog("docx")}
              isLoading={reportsLoading}
            />
          </div>

          {radarChartData && recommendationChartInfo && (
            <Charts
              radarChartData={radarChartData}
              recommendationChartInfo={recommendationChartInfo}
              chartRef={chartRef}
              recommendationChartRef={recommendationChartRef}
            />
          )}
        </div>
      </div>

      <ReportSelectionDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        reports={reportsData?.reports || []}
        onReportSelect={handleSelectReportToExport}
        assessments={assessmentsData?.assessments || []}
        submissions={userSubmissionsData?.submissions || []}
        description={
          exportType === "pdf"
            ? "Select a report to export as PDF"
            : "Select a report to export as DOCX"
        }
      />
    </div>
  );
};
