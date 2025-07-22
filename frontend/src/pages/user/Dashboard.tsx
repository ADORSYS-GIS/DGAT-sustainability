import { FeatureCard } from "@/components/shared/FeatureCard";
import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
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
import { useSubmissionsServiceGetSubmissions } from "../..//openapi-rq//queries/queries";
import type { Submission } from "../../openapi-rq/requests/types.gen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/shared/useAuth";
import { useReportsServiceGetApiUserReports } from "../../openapi-rq/queries/queries";
import { OrgUserManageUsers } from "./OrgUserManageUsers";
import { useAssessmentsServiceGetAssessments } from "@/openapi-rq/queries/queries";

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, isSuccess } =
    useSubmissionsServiceGetSubmissions();
  const submissions: Submission[] = data?.submissions?.slice(0, 3) || [];
  const { data: reportsData, isLoading: reportsLoading } =
    useReportsServiceGetApiUserReports();
  const reports = reportsData?.reports || [];
  const [showManageUsers, setShowManageUsers] = React.useState(false);

  // Get all org assessments for Answer Assessment action
  const { data: assessmentsData } = useAssessmentsServiceGetAssessments();

  React.useEffect(() => {
    if (isError) {
      toast.error(t('user.dashboard.errorLoadingSubmissions'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } else if (isLoading) {
      toast.info(t('user.dashboard.loadingSubmissions'), {
        description: t('user.dashboard.fetchingRecentSubmissions'),
      });
    } else if (isSuccess) {
      toast.success(t('user.dashboard.submissionsLoaded'), {
        description: t('user.dashboard.loadedSubmissions', { count: submissions.length }),
        className: "bg-dgrv-green text-white",
      });
    }
  }, [isError, error, isLoading, isSuccess, submissions.length]);

  const dashboardActions = [
    // Only org_admin can start new assessment
    ...(user?.roles?.includes("org_admin")
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
    // Only org_user sees 'Answer Assessment' card
    ...(!user?.roles?.includes("org_admin")
      ? [
          {
            title: t('user.dashboard.answerAssessment.title'),
            description: t('user.dashboard.answerAssessment.description'),
            icon: FileText,
            color: "blue" as const,
            onClick: () => {
              // Find the first draft assessment and navigate to its answer page
              const draft = (assessmentsData?.assessments || []).find(
                (a: any) => a.status === "draft",
              );
              if (draft) {
                navigate(`/user/assessment/${draft.assessment_id}`);
              } else {
                toast.info(t('user.dashboard.noDraftAssessment'));
              }
            },
          },
        ]
      : []),
    {
      title: t('user.dashboard.viewAssessments.title'),
      description: t('user.dashboard.viewAssessments.description'),
      icon: FileText,
      color: "blue" as const,
      onClick: () => navigate("/assessments"),
    },
    {
      title: t('user.dashboard.actionPlan.title'),
      description: t('user.dashboard.actionPlan.description'),
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => navigate("/action-plan"),
    },
    // Conditionally add Manage Users card for org admins
    ...(user?.roles?.includes("org_admin") ||
    user?.realm_access?.roles?.includes("org_admin")
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
      default:
        return t('user.dashboard.status.unknown');
    }
  };

  const handleExportAllPDF = async () => {
    await exportAllAssessmentsPDF(reports);
  };

  // Get user name and organization name from user object (ID token)
  const userName =
    user?.name || user?.preferred_username || user?.email || t('user.dashboard.user');
  let orgName = t('user.dashboard.org');
  if (user?.organizations && typeof user.organizations === "object") {
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length > 0) {
      orgName = orgKeys[0];
    }
  } else if (user?.organisation_name) {
    orgName = user.organisation_name;
  } else if (user?.organisation) {
    orgName = user.organisation;
  }

  // Check if user has Org_admin role
  const isOrgAdmin = (user?.roles || user?.realm_access?.roles || []).includes(
    "Org_admin",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <Star className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t('user.dashboard.welcome', { user: userName, org: orgName })}
              </h1>
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
                  {isLoading ? (
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
                              {t('user.dashboard.sustainabilityAssessment')}
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
                  {submissions.length === 0 && !isLoading && (
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
                      onClick={handleExportAllPDF}
                      disabled={reportsLoading || reports.length === 0}
                    >
                      {t('user.dashboard.exportAsPDF')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {t('user.dashboard.exportAsWord')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {t('user.dashboard.exportAsCSV')}
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
                  <Button variant="outline" size="sm" className="w-full">
                    {t('user.dashboard.viewUserGuide')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Remove modal logic for Manage Users */}
      {/* Hidden canvas for PDF radar chart export */}
      <canvas
        id="radar-canvas"
        width={500}
        height={400}
        style={{ display: "none" }}
      />
    </div>
  );
};
