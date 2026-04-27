import { FeatureCard } from "@/components/shared/FeatureCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
import { exportAllAssessmentsDOCX } from "@/utils/exportDOCX";
import {
  Calendar,
  CheckSquare,
  Download,
  FileText,
  History,
  Leaf,
  Star,
  Users,
  TrendingUp,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
import type { Submission, OrganizationActionPlan } from "../../openapi-rq/requests/types.gen";
import type { OfflineRecommendation } from "@/types/offline";
import { toast } from "sonner";
import { generateRadarChartData } from "@/utils/radarChart";
import { generateRecommendationChartData } from "@/utils/recommendationChart";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/shared/useAuth";
import { OrgUserManageUsers } from "./OrgUserManageUsers";
import { useOfflineSubmissions } from "@/hooks/useOfflineSubmissions";
import { useOfflineReports, useOfflineUserRecommendations } from "@/hooks/useOfflineReports";
import { useOfflineAssessments } from "@/hooks/useOfflineAssessments";
import { useOfflineAdminSubmissions } from "@/hooks/useOfflineAdminSubmissions";
import { useInitialDataLoad } from "@/hooks/useInitialDataLoad";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { ReportSelectionDialog } from "@/components/shared/ReportSelectionDialog";
import type { Report, AdminSubmissionDetail, RecommendationWithStatus, OrganizationCategory } from "@/openapi-rq/requests/types.gen";
import { useOfflineOrganizationCategories } from "@/hooks/useOfflineOrganizationCategories";

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
  recommendations?: { id: string; text: string; status: "todo" | "in_progress" | "done" | "approved" | string }[];
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chartRef = React.useRef<ChartJS<"radar">>(null);
  const recommendationChartRef = React.useRef<ChartJS<"bar">>(null);

  // Always call both hooks to avoid React hooks violation
  const { data: userSubmissionsData, isLoading: userSubmissionsLoading, error: userSubmissionsError } = useOfflineSubmissions();
  const { data: adminSubmissionsData, isLoading: adminSubmissionsLoading, error: adminSubmissionsError } = useOfflineAdminSubmissions();
  const { data: reportsData, isLoading: reportsLoading } = useOfflineReports();
  const { data: assessmentsData } = useOfflineAssessments();
  const { data: userRecommendations } = useOfflineUserRecommendations();
  const { organizationCategories: organizationCategoriesData } = useOfflineOrganizationCategories();

  const { data: questionsData } = useOfflineQuestions();
  const { data: categoriesData } = useOfflineCategoryCatalogs();

  const questionsTextMap = React.useMemo(() => {
    const textMap = new Map<string, string>(); // question text -> category name

    // Create a mapping from category_id to category name
    const categoryIdToName = new Map<string, string>();
    const categoryNameToId = new Map<string, string>();
    if (categoriesData) {
      categoriesData.forEach(cat => {
        categoryIdToName.set(cat.category_catalog_id, cat.name);
        categoryNameToId.set(cat.name.toLowerCase(), cat.category_catalog_id);
      });
    }

    if (questionsData) {
      questionsData.forEach(q => {
        if (q.latest_revision) {
          const qText = (q.latest_revision.text as { en?: string })?.en || '';

          // Map the revision ID to the actual proper category name
          let catName = 'Uncategorized';
          const qCat = q.category || q.category_id;
          if (qCat) {
            if (categoryIdToName.has(qCat)) {
              catName = categoryIdToName.get(qCat)!;
            } else if (categoryNameToId.has(qCat.toLowerCase())) {
              catName = categoryIdToName.get(categoryNameToId.get(qCat.toLowerCase())!) || qCat;
            } else {
              catName = qCat;
            }
          }
          if (qText) {
            textMap.set(qText, catName);
          }
        }
      });
    }
    return textMap;
  }, [questionsData, categoriesData]);

  // Add initial data loading hook
  const { refreshData } = useInitialDataLoad();

  // Both org_admin and Org_User use the same data source - no differentiation
  // All users load the same data to their local storage
  const submissionsData = userSubmissionsData;
  const submissionsLoading = userSubmissionsLoading;
  const submissionsError = userSubmissionsError;

  // Deduplicate reports by submission_id, keeping only the latest generated_at
  const uniqueReports = React.useMemo(() => {
    if (!reportsData?.reports) return [];

    const latestReportsMap = new Map<string, Report>();

    reportsData.reports.forEach(report => {
      const existingReport = latestReportsMap.get(report.submission_id);
      if (!existingReport) {
        latestReportsMap.set(report.submission_id, report);
      } else {
        const existingDate = new Date(existingReport.generated_at);
        const currentDate = new Date(report.generated_at);

        if (currentDate > existingDate ||
          (currentDate.getTime() === existingDate.getTime() && report.report_id > existingReport.report_id)) {
          latestReportsMap.set(report.submission_id, report);
        }
      }
    });

    return Array.from(latestReportsMap.values());
  }, [reportsData?.reports]);

  // Filter assessments by organization and status
  const filteredAssessments = React.useMemo(() => {
    if (!assessmentsData?.assessments || !user?.organizations) {
      return [];
    }

    // Get the user's organization ID
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) {
      return [];
    }

    const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgKeys[0]];
    const organizationId = orgData?.id;

    if (!organizationId) {
      return [];
    }

    // Filter by organization and status
    const filtered = assessmentsData.assessments.filter((assessment) => {
      const assessmentData = assessment as unknown as {
        assessment_id?: string;
        status: string;
        organization_id?: string;
        org_id?: string;
      };

      const isDraft = assessmentData.status === "draft";
      // Check both org_id and organization_id fields
      const isInOrganization = assessmentData.organization_id === organizationId ||
        assessmentData.org_id === organizationId;

      return isDraft && isInOrganization;
    });

    return filtered;
  }, [assessmentsData?.assessments, user?.organizations]);

  const submissions: Submission[] = submissionsData?.submissions?.slice(0, 5) || [];
  const recommendations: OfflineRecommendation[] = reportsData?.recommendations || [];
  const [showManageUsers, setShowManageUsers] = React.useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = React.useState(false);
  const [exportType, setExportType] = React.useState<"pdf" | "docx">("pdf");

  const handleOpenReportDialog = (type: "pdf" | "docx") => {
    setExportType(type);
    setIsReportDialogOpen(true);
  };

  const mapReportToExportInputs = (
    report: Report
  ): { submissions: AdminSubmissionDetail[]; recommendations: RecommendationWithStatus[] } => {
    const categoriesObj: Record<string, ReportCategoryData> =
      Array.isArray(report.data) && report.data.length > 0
        ? (report.data[0] as unknown as Record<string, ReportCategoryData>)
        : {};

    // Build a pseudo AdminSubmissionDetail with responses shaped for drawTable
    const responses = Object.entries(categoriesObj).flatMap(
      ([category, categoryData]) => {
        const questions = Array.isArray(categoryData?.questions)
          ? categoryData.questions!
          : [];
        return questions.map((q): { question_category: string; question_text: string; response: string } => ({
          question_category: category,
          question_text: q?.question ?? "",
          response: JSON.stringify(q?.answer ?? {}),
        }));
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

    const recommendations: RecommendationWithStatus[] = Object.entries(categoriesObj).flatMap(
      ([category, categoryData]) => {
        const categoryRecommendations = Array.isArray(categoryData?.recommendations)
          ? categoryData.recommendations
          : [];
        return categoryRecommendations
          .filter((rec) => rec.text !== "No recommendation provided" && rec.text !== "No action plan given")
          .map((rec) => ({
            recommendation_id: rec.id,
            report_id: report.report_id,
            assessment_id: report.assessment_id,
            assessment_name: report.assessment_name,
            category,
            recommendation: rec.text,
            status: (rec.status as RecommendationWithStatus["status"]) || "todo",
            created_at: report.generated_at,
          }));
      }
    );

    // Deduplicate recommendations by category + recommendation text (same logic as admin)
    const deduplicatedMap = new Map<string, RecommendationWithStatus>();

    recommendations.forEach((rec) => {
      const normalizedCategory = rec.category.toLowerCase().trim();
      const key = `${normalizedCategory}-${rec.recommendation.toLowerCase().trim()}`;

      // Keep the most recent recommendation if duplicates exist
      if (!deduplicatedMap.has(key) ||
        new Date(rec.created_at) > new Date(deduplicatedMap.get(key)!.created_at)) {
        deduplicatedMap.set(key, rec);
      }
    });

    const deduplicatedRecommendations = Array.from(deduplicatedMap.values());

    return { submissions, recommendations: deduplicatedRecommendations };
  };

  const handleSelectReportToExport = async (report: { report_id: string }) => {
    try {
      const fullReport = reportsData?.reports?.find(
        (r) => r.report_id === report.report_id
      );
      if (!fullReport) return;

      const { submissions: singleSubmissions, recommendations: singleRecs } =
        mapReportToExportInputs(fullReport as Report);

      const radarChartDataUrl = chartRef.current?.toBase64Image();
      const recommendationChartDataUrl = recommendationChartRef.current?.toBase64Image();

      if (exportType === "pdf") {
        await exportAllAssessmentsPDF(
          singleSubmissions,
          singleRecs,
          radarChartDataUrl,
          recommendationChartDataUrl,
          (fullReport as any).org_name || orgName,
          (fullReport as any).assessment_name
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

  React.useEffect(() => {
    if (submissionsError) {
      // Removed unnecessary error toast for loading submissions
    } else if (submissionsLoading) {
      // Removed unnecessary loading toast
    } else if (submissionsData) {
      // Removed unnecessary success toast for loaded submissions
    }
  }, [submissionsError, submissionsLoading, submissionsData, submissions.length, t]);

  // Remove the offline status useEffect

  const dashboardActions = [
    // 1. Start Assessment (org_admin)
    ...(user?.roles?.includes("org_admin") || user?.realm_access?.roles?.includes("org_admin")
      ? [
        {
          title: t('user.dashboard.startAssessment.title'),
          description: t('user.dashboard.startAssessment.description'),
          icon: Leaf,
          color: "green" as const,
          onClick: () => navigate("/assessment/sustainability"),
        },
      ]
      : []),
    // Answer Assessment (Org_User)
    ...(!user?.roles?.includes("org_admin") && !user?.realm_access?.roles?.includes("org_admin")
      ? [
        {
          title: t('user.dashboard.answerAssessment.title'),
          description: t('user.dashboard.answerAssessment.description'),
          icon: FileText,
          color: "blue" as const,
          onClick: () => navigate("/user/assessment-list"),
        },
      ]
      : []),
    // 2. Manage Users (org_admin)
    ...(user?.roles?.includes("org_admin") || user?.realm_access?.roles?.includes("org_admin")
      ? [
        {
          title: t('user.dashboard.manageUsers.title'),
          description: t('user.dashboard.manageUsers.description'),
          icon: Users,
          color: "blue" as const,
          onClick: () => navigate("/user/manage-users"),
        },
      ]
      : []),
    // 3. Draft Submissions (org_admin)
    ...(user?.roles?.includes("org_admin") || user?.realm_access?.roles?.includes("org_admin")
      ? [
        {
          title: t('user.dashboard.draftSubmissions.title'),
          description: t('user.dashboard.draftSubmissions.description'),
          icon: CheckSquare,
          color: "green" as const,
          onClick: () => navigate("/user/draft-submissions"),
        },
      ]
      : []),
    // 4. Review Assessments (org_admin)
    ...(user?.roles?.includes("org_admin") || user?.realm_access?.roles?.includes("org_admin")
      ? [
        {
          title: t('user.dashboard.reviewAssessments.title'),
          description: t('user.dashboard.reviewAssessments.description'),
          icon: CheckSquare,
          color: "blue" as const,
          onClick: () => navigate("/user/reviews"),
        },
      ]
      : []),
    // 5. View Assessments (all users)
    {
      title: t('user.dashboard.viewAssessments.title'),
      description: t('user.dashboard.viewAssessments.description'),
      icon: FileText,
      color: "green" as const,
      onClick: () => navigate("/assessments"),
    },
    // 6. Action Plan (all users)
    {
      title: t('user.dashboard.actionPlan.title'),
      description: t('user.dashboard.actionPlan.description'),
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => navigate("/user/assessment-submissions"),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-dgrv-green text-white";
      case "pending_review":
        return "bg-blue-500 text-white";
      case "under_review":
        return "bg-orange-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "revision_requested":
        return "bg-yellow-500 text-white";
      case "reviewed":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "approved":
        return t('user.dashboard.status.approved');
      case "pending_review":
        return t('user.dashboard.status.pendingReview');
      case "under_review":
        return t('user.dashboard.status.underReview');
      case "rejected":
        return t('user.dashboard.status.rejected');
      case "revision_requested":
        return t('user.dashboard.status.revisionRequested');
      case "reviewed":
        return t('user.dashboard.status.reviewed', { defaultValue: 'Reviewed' });
      default:
        return t('user.dashboard.status.unknown');
    }
  };

  const handleExportAllPDF = async () => {
    const radarChartDataUrl = chartRef.current?.toBase64Image();
    const recommendationChartDataUrl =
      recommendationChartRef.current?.toBase64Image();

    // Use only the latest report to avoid duplicates
    const latestReport = userRecommendations?.reports?.reduce((latest, current) => {
      return new Date(current.generated_at) > new Date(latest.generated_at) ? current : latest;
    });

    if (!latestReport) return;

    // Use the same mapReportToExportInputs function to ensure consistency
    const { submissions: singleSubmissions, recommendations: singleRecs } =
      mapReportToExportInputs(latestReport as unknown as Report);

    await exportAllAssessmentsPDF(
      singleSubmissions,
      singleRecs,
      radarChartDataUrl,
      recommendationChartDataUrl,
      orgName,
      latestReport?.assessment_name || "Assessment"
    );
  };

  const handleExportAllDOCX = async () => {
    const radarChartDataUrl = chartRef.current?.toBase64Image();
    const recommendationChartDataUrl =
      recommendationChartRef.current?.toBase64Image();

    // Use only the latest report to avoid duplicates
    const latestReport = userRecommendations?.reports?.reduce((latest, current) => {
      return new Date(current.generated_at) > new Date(latest.generated_at) ? current : latest;
    });

    if (!latestReport) return;

    // Use the same mapReportToExportInputs function to ensure consistency
    const { submissions: singleSubmissions, recommendations: singleRecs } =
      mapReportToExportInputs(latestReport as unknown as Report);

    await exportAllAssessmentsDOCX(
      singleSubmissions,
      singleRecs,
      radarChartDataUrl,
      recommendationChartDataUrl
    );
  };

  // Get user name and organization name from user object (ID token)
  const userName =
    user?.name || user?.preferred_username || user?.email || t('user.dashboard.user');
  let orgName = t('user.dashboard.org');
  let orgId = "";
  let categories: string[] = [];

  if (user?.organizations && typeof user.organizations === "object") {
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length > 0) {
      orgName = orgKeys[0]; // First organization name
      const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgName];
      if (orgData) {
        orgId = orgData.id || "";
        categories = orgData.categories || [];
      }
    }
  }

  // Check if user has Org_admin role
  const isOrgAdmin = (user?.roles || user?.realm_access?.roles || []).includes(
    "Org_admin",
  );

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

  const radarChartData = React.useMemo(() => {
    if (reportsData?.reports && organizationCategoriesData) {
      // Enrich reports to avoid "Unknown" labels in radar chart
      const enrichedReports = reportsData.reports.map(report => {
        if (!report.data || !Array.isArray(report.data)) return report;

        const enrichedData = report.data.map(categoryObj => {
          const newCategoryObj: Record<string, any> = {};
          Object.entries(categoryObj).forEach(([catKey, catVal]) => {
            let label = catKey;
            if (!label || label.toLowerCase() === 'uncategorized' || label.toLowerCase().includes('unknown')) {
              const questions = (catVal as any).questions;
              if (questions && Array.isArray(questions) && questions.length > 0) {
                const qText = questions[0].question;
                if (questionsTextMap.has(qText)) {
                  label = questionsTextMap.get(qText)!;
                }
              }
            }
            newCategoryObj[label] = catVal;
          });
          return newCategoryObj;
        });

        return { ...report, data: enrichedData };
      });

      return generateRadarChartData({ reports: enrichedReports as any, organizationCategories: organizationCategoriesData });
    }
    return null;
  }, [reportsData, organizationCategoriesData, questionsTextMap]);


  const radarChartOptions = {
    maintainAspectRatio: false,
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 14, // Increase font size for category labels
          },
        },
      },
    },
  };

  const recommendationChartInfo = React.useMemo(() => {
    if (userRecommendations?.reports && userRecommendations.reports.length > 0) {
      // Use only the latest report to avoid duplicates
      const latestReport = userRecommendations.reports.reduce((latest, current) => {
        return new Date(current.generated_at) > new Date(latest.generated_at) ? current : latest;
      });

      const categoriesObj = Array.isArray(latestReport.data) && latestReport.data.length > 0 ? latestReport.data[0] : {};
      const reportRecommendations = Object.entries(categoriesObj as Record<string, { recommendations: { id: string; text: string; status: string }[] }>).flatMap(([categoryName, category]) =>
        (category.recommendations || []).map(r => ({
          ...r,
          report_id: latestReport.report_id,
          created_at: latestReport.generated_at,
          assessment_id: latestReport.assessment_id,
          assessment_name: latestReport.assessment_name,
          category: categoryName
        }))
      );

      return generateRecommendationChartData(reportRecommendations.map(r => ({
        ...r,
        recommendation_id: r.id,
        recommendation: r.text,
        status: r.status as RecommendationWithStatus['status']
      })));
    }
    return null;
  }, [userRecommendations]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {recommendationChartInfo && (
        <div style={{ width: '800px', height: '400px', position: 'absolute', zIndex: -1, opacity: 0 }}>
          <Bar
            ref={recommendationChartRef as any}
            data={recommendationChartInfo.data as any}
            options={recommendationChartInfo.options as any}
          />
        </div>
      )}

      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-white border-b shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white to-blue-50/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            {/* Branded Logo Container */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-44 h-44 md:w-56 md:h-56 bg-white rounded-[2.2rem] shadow-2xl p-6 flex items-center justify-center border border-slate-100">
                <img
                  src="/coopsustainability-removebg-preview.png"
                  alt="Coop Sustainability Logo"
                  className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Welcome Typography */}
            <div className="text-center md:text-left space-y-6 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 animate-in fade-in slide-in-from-left-4 duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('systemActive', { defaultValue: 'Platform Active' })}</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  {t('user.dashboard.welcome', { user: userName, org: orgName })}
                </h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">
                  {t('user.dashboard.readyToContinue')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Modern Quick Actions Grid */}
        <section>
          <div className="flex items-center space-x-2 mb-8 ml-1">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('quickActions', { defaultValue: 'Quick Actions' })}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardActions.map((action, index) => (
              <div
                key={action.title}
                className="group animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FeatureCard
                  {...action}
                  className="h-full border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500 bg-white group-hover:-translate-y-1"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity Card */}
          <Card className="lg:col-span-2 border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-white/50">
              <CardTitle className="flex items-center space-x-3 text-slate-800">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-bold tracking-tight">{t('user.dashboard.recentSubmissions')}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                onClick={() => navigate("/assessments")}
              >
                {t('user.dashboard.viewAll')}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {submissionsLoading ? (
                  <LoadingSpinner
                    size="md"
                    text={t('user.dashboard.loadingSubmissionsInline')}
                  />
                ) : (
                  submissions.map((submission) => (
                    <div
                      key={submission.submission_id}
                      className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-xl bg-slate-50 group-hover:bg-emerald-50 transition-colors">
                          <Leaf className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {submission.assessment_name || t('user.dashboard.sustainabilityAssessment')}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(submission.review_status)} px-3 py-1 rounded-lg font-bold border-none shadow-sm`}>
                        {formatStatus(submission.review_status)}
                      </Badge>
                    </div>
                  ))
                )}
                {submissions.length === 0 && !submissionsLoading && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <History className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400 font-bold tracking-tight">
                      {t('user.dashboard.noSubmissions')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side Utility Cards */}
          <div className="space-y-6">
            {/* Export Card */}
            <Card className="border-slate-200/60 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-slate-800">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Download className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="font-bold tracking-tight">{t('user.dashboard.exportReports')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {t('user.dashboard.downloadReportsDescription')}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between hover:border-blue-300 hover:bg-blue-50 group h-11"
                    onClick={() => handleOpenReportDialog("pdf")}
                    disabled={reportsLoading}
                  >
                    <span className="font-bold">{t('user.dashboard.exportAsPDF')}</span>
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between hover:border-slate-300 hover:bg-slate-50 group h-11"
                    onClick={() => handleOpenReportDialog("docx")}
                    disabled={reportsLoading}
                  >
                    <span className="font-bold">{t('user.dashboard.exportAsDOCX')}</span>
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="border-none bg-slate-900 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
              <CardHeader>
                <CardTitle className="text-emerald-400 font-black tracking-widest text-xs uppercase">{t('user.dashboard.needHelp')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-slate-300 font-medium">
                  {t('user.dashboard.getSupport')}
                </p>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black h-12 shadow-lg shadow-emerald-500/20"
                  onClick={() => navigate("/user/guide")}
                >
                  {t('user.dashboard.viewUserGuide')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Visualization Section */}
        {radarChartData && (
          <section className="animate-in fade-in zoom-in duration-1000">
            <Card className="border-slate-200/60 shadow-xl bg-white">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-bold tracking-tight">{t('user.dashboard.sustainabilityOverview')}</span>
                  </div>
                  <Badge variant="outline" className="text-slate-400 font-bold border-slate-200 bg-slate-50">
                    {(() => {
                      const latestReport = reportsData?.reports?.reduce((latest, current) => {
                        return new Date(current.generated_at) > new Date(latest.generated_at) ? current : latest;
                      });
                      return latestReport?.assessment_name || t('user.dashboard.sustainabilityAssessment');
                    })()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[450px] flex items-center justify-center">
                  <Radar ref={chartRef} data={radarChartData} options={radarChartOptions} />
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <ReportSelectionDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        reports={uniqueReports}
        onReportSelect={handleSelectReportToExport}
        assessments={assessmentsData?.assessments || []}
        submissions={submissionsData?.submissions || []}
        description={
          exportType === "pdf"
            ? t('user.dashboard.actionPlan.selectReportDescription')
            : t('user.dashboard.actionPlan.selectReportDescriptionDOCX')
        }
      />
    </div>
  );
};
