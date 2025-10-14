import { FeatureCard } from "@/components/shared/FeatureCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
import { exportAllAssessmentsDOCX } from "@/utils/exportDOCX";
import {
  CheckSquare,
  Download,
  FileText,
  History,
  Leaf,
  Star,
  Users,
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
import { ReportSelectionDialog } from "@/components/shared/ReportSelectionDialog";
import type { Report, AdminSubmissionDetail, RecommendationWithStatus } from "@/openapi-rq/requests/types.gen";

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
  
  // Add initial data loading hook
  const { refreshData } = useInitialDataLoad();
  
  // Both org_admin and Org_User use the same data source - no differentiation
  // All users load the same data to their local storage
  const submissionsData = userSubmissionsData;
  const submissionsLoading = userSubmissionsLoading;
  const submissionsError = userSubmissionsError;
  
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
      onClick: () => navigate("/action-plan"),
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

    const allRecommendations = userRecommendations?.reports.flatMap(report => {
      const categoriesObj = Array.isArray(report.data) && report.data.length > 0 ? report.data[0] : {};
      return Object.values(categoriesObj as Record<string, { recommendations: { id: string; text: string; status: string }[] }>).flatMap(category =>
        (category.recommendations || []).map(r => ({ ...r, report_id: report.report_id, created_at: report.generated_at }))
      );
    }) || [];
    await exportAllAssessmentsPDF(
      adminSubmissionsData?.submissions || [],
      allRecommendations.map(r => ({ ...r, recommendation_id: r.id, recommendation: r.text, category: '', status: r.status as RecommendationWithStatus['status'] })),
      radarChartDataUrl,
      recommendationChartDataUrl
    );
  };

  const handleExportAllDOCX = async () => {
    const radarChartDataUrl = chartRef.current?.toBase64Image();
    const recommendationChartDataUrl =
      recommendationChartRef.current?.toBase64Image();

    const allRecommendations = userRecommendations?.reports.flatMap(report => {
      const categoriesObj = Array.isArray(report.data) && report.data.length > 0 ? report.data[0] : {};
      return Object.values(categoriesObj as Record<string, { recommendations: { id: string; text: string; status: string }[] }>).flatMap(category =>
        (category.recommendations || []).map(r => ({ ...r, report_id: report.report_id, created_at: report.generated_at }))
      );
    }) || [];
    await exportAllAssessmentsDOCX(
      adminSubmissionsData?.submissions || [],
      allRecommendations.map(r => ({ ...r, recommendation_id: r.id, recommendation: r.text, category: '', status: r.status as RecommendationWithStatus['status'] })),
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
    if (reportsData?.reports) {
      return generateRadarChartData({ reports: reportsData.reports });
    }
    return null;
  }, [reportsData]);


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
    if (userRecommendations?.reports) {
      const allRecommendations = userRecommendations.reports.flatMap(report => {
        const categoriesObj = Array.isArray(report.data) && report.data.length > 0 ? report.data[0] : {};
        return Object.values(categoriesObj as Record<string, { recommendations: { id: string; text: string; status: string }[] }>).flatMap(category =>
          (category.recommendations || []).map(r => ({ ...r, report_id: report.report_id, created_at: report.generated_at }))
        );
      });
      return generateRecommendationChartData(allRecommendations.map(r => ({ ...r, recommendation_id: r.id, recommendation: r.text, category: '', status: r.status as RecommendationWithStatus['status'] })));
    }
    return null;
  }, [userRecommendations]);
 
  return (
    <div className="min-h-screen bg-gray-50">
      {recommendationChartInfo && (
        <div style={{ width: '800px', height: '400px', position: 'absolute', zIndex: -1, opacity: 0 }}>
          <Bar
            ref={recommendationChartRef}
            data={recommendationChartInfo.data}
            options={recommendationChartInfo.options}
          />
        </div>
      )}
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-dgrv-green" />
                <h1 className="text-3xl font-bold text-dgrv-blue">
                  {t('user.dashboard.welcome', { user: userName, org: orgName })}
                </h1>
              </div>
            </div>
            <p className="text-lg text-gray-600">
              {t('user.dashboard.readyToContinue')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {dashboardActions.map((action, index) => (
              <div
                key={action.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FeatureCard {...action} />
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-dgrv-blue" />
                  <span>{t('user.dashboard.recentSubmissions')}</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/assessments")}
                >
                  {t('user.dashboard.viewAll')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissionsLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('user.dashboard.loadingSubmissionsInline')}</p>
                    </div>
                  ) : (
                    submissions.map((submission) => (
                      <div
                        key={submission.submission_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-gray-100">
                            <Leaf className="w-5 h-5 text-dgrv-green" />
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {submission.assessment_name || t('user.dashboard.sustainabilityAssessment')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                submission.submitted_at,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            className={getStatusColor(submission.review_status)}
                          >
                            {formatStatus(submission.review_status)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                  {submissions.length === 0 && !submissionsLoading && (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>
                        {t('user.dashboard.noSubmissions')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card
                className="animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-dgrv-blue" />
                    <span>{t('user.dashboard.exportReports')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('user.dashboard.downloadReportsDescription')}
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleOpenReportDialog("pdf")}
                      disabled={reportsLoading}
                    >
                      {t('user.dashboard.exportAsPDF')}
                    </Button>
                    {/* Keep bulk export available if needed */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleOpenReportDialog("docx")}
                      disabled={reportsLoading}
                    >
                      {t('user.dashboard.exportAsDOCX')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-dgrv-green">{t('user.dashboard.needHelp')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('user.dashboard.getSupport')}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-dgrv-green text-white hover:bg-green-700"
                    onClick={() => navigate("/user/guide")}
                  >
                    {t('user.dashboard.viewUserGuide')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {radarChartData && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>{t('user.dashboard.sustainabilityOverview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '400px' }}>
                    <Radar ref={chartRef} data={radarChartData} options={radarChartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ReportSelectionDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        reports={reportsData?.reports || []}
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
