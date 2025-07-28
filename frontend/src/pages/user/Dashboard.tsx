import { FeatureCard } from "@/components/shared/FeatureCard";
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
  RefreshCw,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { Submission } from "../../openapi-rq/requests/types.gen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/shared/useAuth";
import { OrgUserManageUsers } from "./OrgUserManageUsers";
import { 
  useOfflineSubmissions, 
  useOfflineReports, 
  useOfflineAssessments,
  useOfflineAdminSubmissions
} from "@/hooks/useOfflineApi";
import { useInitialDataLoad } from "@/hooks/useInitialDataLoad";

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Always call both hooks to avoid React hooks violation
  const { data: userSubmissionsData, isLoading: userSubmissionsLoading, error: userSubmissionsError } = useOfflineSubmissions();
  const { data: adminSubmissionsData, isLoading: adminSubmissionsLoading, error: adminSubmissionsError } = useOfflineAdminSubmissions();
  const { data: reportsData, isLoading: reportsLoading } = useOfflineReports();
  const { data: assessmentsData } = useOfflineAssessments();
  
  // Add initial data loading hook
  const { refreshData } = useInitialDataLoad();
  
  // Choose the appropriate submissions data based on user role
  const isOrgUser = user?.roles?.includes('org_user') || user?.realm_access?.roles?.includes('org_user');
  const submissionsData = isOrgUser ? adminSubmissionsData : userSubmissionsData;
  const submissionsLoading = isOrgUser ? adminSubmissionsLoading : userSubmissionsLoading;
  const submissionsError = isOrgUser ? adminSubmissionsError : userSubmissionsError;
  
  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      await refreshData();
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
      console.error('Manual refresh failed:', error);
    }
  };

  // Force clear and reload function
  const handleForceReload = async () => {
    try {
      console.log('🔍 Force reload triggered');
      const { InitialDataLoader } = await import('@/services/initialDataLoader');
      const loader = new InitialDataLoader();
      
      // Clear all data
      await loader.clearAllData();
      console.log('🔍 All data cleared');
      
      // Force reload
      await refreshData();
      toast.success('Data force reloaded successfully!');
    } catch (error) {
      toast.error('Failed to force reload data');
      console.error('Force reload failed:', error);
    }
  };
  
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
    
    console.log('🔍 Filtering assessments for organization:', organizationId);
    console.log('🔍 Total assessments available:', assessmentsData.assessments.length);
    
    // Filter by organization and status
    const filtered = assessmentsData.assessments.filter((assessment) => {
      const assessmentData = assessment as unknown as { 
        status: string; 
        organization_id?: string;
      };
      
      const isDraft = assessmentData.status === "draft";
      const isInOrganization = assessmentData.organization_id === organizationId;
      
      console.log('🔍 Assessment:', assessment.assessment_id, 'status:', assessmentData.status, 'org:', assessmentData.organization_id, 'isDraft:', isDraft, 'isInOrg:', isInOrganization);
      
      return isDraft && isInOrganization;
    });
    
    console.log('🔍 Filtered assessments for org user:', filtered.length);
    return filtered;
  }, [assessmentsData?.assessments, user?.organizations]);
  
  const submissions: Submission[] = submissionsData?.submissions?.slice(0, 5) || [];
  const reports = reportsData?.reports || [];
  const [showManageUsers, setShowManageUsers] = React.useState(false);

  React.useEffect(() => {
    if (submissionsError) {
      toast.error(t('user.dashboard.errorLoadingSubmissions'), {
        description: submissionsError.message,
      });
    } else if (submissionsLoading) {
      toast.info(t('user.dashboard.loadingSubmissions'), {
        description: t('user.dashboard.fetchingRecentSubmissions'),
      });
    } else if (submissionsData) {
      toast.success(t('user.dashboard.submissionsLoaded'), {
        description: t('user.dashboard.loadedSubmissions', { count: submissions.length }),
        className: "bg-dgrv-green text-white",
      });
    }
  }, [submissionsError, submissionsLoading, submissionsData, submissions.length, t]);

  // Remove the offline status useEffect

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
              // Use the filtered assessments (already filtered by organization and status)
              if (filteredAssessments.length > 0) {
                const latestDraft = filteredAssessments.reduce((latest, current) => {
                  return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
                }, filteredAssessments[0]);
                navigate(`/user/assessment/${latestDraft.assessment_id}`);
              } else {
                toast.info(t('user.dashboard.noDraftAssessment', { 
                  defaultValue: 'No draft assessment available. Please contact your organization administrator to create an assessment.' 
                }));
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
  let orgId = "";
  let categories: string[] = [];
  
  // Debug: Log the decoded ID token
  console.log('Decoded ID Token:', user);
  console.log('🔍 Dashboard - User organizations:', user?.organizations);
  console.log('🔍 Dashboard - Assessments data:', assessmentsData);
  console.log('🔍 Dashboard - User submissions data:', userSubmissionsData);
  console.log('🔍 Dashboard - Admin submissions data:', adminSubmissionsData);
  console.log('🔍 Dashboard - Is org user:', isOrgUser);
  console.log('🔍 Dashboard - Selected submissions data:', submissionsData);
  console.log('🔍 Dashboard - Filtered assessments:', filteredAssessments);
  
  if (user?.organizations && typeof user.organizations === "object") {
    const orgKeys = Object.keys(user.organizations);
    console.log('Organization keys:', orgKeys);
    if (orgKeys.length > 0) {
      orgName = orgKeys[0]; // First organization name
      const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgName];
      console.log('Organization data for', orgName, ':', orgData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-dgrv-green" />
                <h1 className="text-3xl font-bold text-dgrv-blue">
                  {t('user.dashboard.welcome', { user: userName, org: orgName })}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Data</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceReload}
                  className="flex items-center space-x-2 bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Force Reload</span>
                </Button>
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
