import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineAdminSubmissions } from "@/hooks/useOfflineAdminSubmissions";
import { useOfflineOrganizations } from "@/hooks/useOfflineOrganizations";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import {
  BookOpen,
  Kanban,
  List,
  Settings,
  TrendingUp,
  Users
} from "lucide-react";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type Organization = { organizationId: string; name: string };

interface PendingReview {
  id: string;
  organization: string;
  type: string;
  submittedAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Always call both hooks to avoid React hooks violation
  const { data: submissionsData, isLoading: submissionsLoading, error: error, refetch: refetchSubmissions } = useOfflineAdminSubmissions();
  
  // Both org_admin and DGRV_admin use the same data source - no differentiation
  // All admins load the same data to their local storage
  const submissions = submissionsData?.submissions || [];
  
  // Refetch data when component mounts to ensure fresh data
  React.useEffect(() => {
    refetchSubmissions();
  }, [refetchSubmissions]);
  
  // Debug logging to understand submission statuses
  React.useEffect(() => {
    if (submissions.length > 0) {
      console.log('📊 Submission Status Breakdown:');
      const statusCounts = submissions.reduce((acc, submission) => {
        acc[submission.review_status] = (acc[submission.review_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Status counts:', statusCounts);
      console.log('Total submissions:', submissions.length);
    }
  }, [submissions]);
  
  // Filter submissions by status for different views
  const pendingSubmissions = submissions.filter(
    submission => submission.review_status === 'under_review' || submission.review_status === 'pending_review'
  );
  
  const approvedSubmissions = submissions.filter(
    submission => submission.review_status === 'approved'
  );
  
  const rejectedSubmissions = submissions.filter(
    submission => submission.review_status === 'rejected'
  );
  
  // Add filter for reviewed submissions (new status from API)
  const reviewedSubmissions = submissions.filter(
    submission => (submission.review_status as string) === 'reviewed'
  );
  
  const totalSubmissions = submissions.length;

  React.useEffect(() => {
    if (error) {
      // Removed error loading submissions toast
    } else if (submissionsLoading) {
      // Removed loading submissions info toast
    } else if (submissionsData && submissions.length > 0) {
      // Removed loaded submissions success toast
    }
  }, [error, submissionsLoading, submissionsData, submissions.length]);

  const pendingReviews = useMemo(() => {
    if (submissionsLoading) return [];

    return pendingSubmissions.map((submission) => ({
      id: submission.submission_id,
      organization: submission.org_name || t('unknownOrganization'),
      type: "Sustainability",
      submittedAt: new Date(submission.submitted_at).toLocaleDateString(
        "en-CA",
      ),
      reviewStatus: submission.review_status,
    }));
  }, [submissionsLoading, pendingSubmissions]);

  // Dynamic pending reviews count (pending_review or under_review)
  const pendingReviewsCount = React.useMemo(
    () =>
      pendingSubmissions.length,
    [pendingSubmissions],
  );
  const completedCount = React.useMemo(
    () =>
      approvedSubmissions.length + rejectedSubmissions.length + reviewedSubmissions.length,
    [approvedSubmissions, rejectedSubmissions, reviewedSubmissions],
  );

  const keycloakAdminUrl = import.meta.env.VITE_KEYCLOAK_ADMIN_URL;
  const adminActions = [
    {
      title: t('adminDashboard.manageOrganizations'),
      description: t('adminDashboard.manageOrganizationsDesc'),
      icon: Users,
      color: "blue" as const, 
      onClick: () => navigate("/admin/organizations"),
    },
    {
      title: t('adminDashboard.manageUsers'),
      description: t('adminDashboard.manageUsersDesc'),
      icon: Users,
      color: "blue" as const,
      onClick: () => navigate("/admin/users"),
    },
    {
      title: t('adminDashboard.manageCategories'),
      description: t('adminDashboard.manageCategoriesDesc'),
      icon: List,
      color: "green" as const,
      onClick: () => navigate("/admin/categories"),
    },
    {
      title: t('adminDashboard.manageQuestions'),
      description: t('adminDashboard.manageQuestionsDesc'),
      icon: BookOpen,
      color: "blue" as const,
      onClick: () => navigate("/admin/questions"),
    },
    {
      title: t('adminDashboard.actionPlans', { defaultValue: 'Manage Action Plans' }),
      description: t('adminDashboard.actionPlansDesc', { defaultValue: 'View and manage action plans for all organizations' }),
      icon: Kanban,
      color: "blue" as const,
      onClick: () => navigate("/admin/action-plans"),
    },
    {
      title: t('reportHistory.title', { defaultValue: 'Report History' }),
      description: t('reportHistory.subtitle', { defaultValue: 'View and manage all organization reports' }),
      icon: TrendingUp,
      color: "blue" as const,
      onClick: () => navigate("/admin/report-history"),
    },
  ];

  // Dynamic counts for categories and questions using offline hooks
  // Fetch categories count from offline data
  const { data: categoriesData, isLoading: categoriesLoading } = useOfflineCategoryCatalogs();
  const categoryCount = categoriesData?.length || 0;

  // Fetch questions count from offline data
  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const questionCount = questionsData?.length || 0;

  // Fetch organizations count from offline data
  const { organizations, isLoading: organizationsLoading } = useOfflineOrganizations();
  const organizationCount = organizations?.length || 0;

  // Check if any data is still loading
  const isDataLoading = submissionsLoading || categoriesLoading || questionsLoading || organizationsLoading;

  const systemStats = [
    { label: t('adminDashboard.numCategories'), value: categoryCount, color: "blue", loading: categoriesLoading },
    { label: t('adminDashboard.numQuestions'), value: questionCount, color: "green", loading: questionsLoading },
    { label: t('adminDashboard.numOrganizations'), value: organizationCount, color: "purple", loading: organizationsLoading },
    {
      label: t('adminDashboard.completedAssessments'),
      value: completedCount,
      color: "blue",
      loading: submissionsLoading,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-dgrv-blue" />
                <h1 className="text-3xl font-bold text-dgrv-blue">
                  {t('adminDashboard.welcome')}
                </h1>
              </div>
            </div>
            <p className="text-lg text-gray-600">
              {t('adminDashboard.intro')}
            </p>
          </div>

          {/* System Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {systemStats.map((stat, index) => (
              <Card
                key={stat.label}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-dgrv-blue mb-1">
                    {stat.loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dgrv-blue"></div>
                      </div>
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Management Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {adminActions.map((action, index) => (
              <div
                key={action.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FeatureCard {...action} />
              </div>
            ))}
          </div>

          {/* Dashboard Content */}
          <div className="grid lg:grid-cols-1 gap-8">
            {/* Admin Guide */}
            <div className="space-y-6 lg:col-span-1">
              <Card
                className="animate-fade-in cursor-pointer hover:shadow-lg transition-shadow"
                style={{ animationDelay: "200ms" }}
                onClick={() => navigate("/admin/guide")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-dgrv-blue" />
                    <span>{t('adminDashboard.adminGuide')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>{t('adminDashboard.guideIntro')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{t('adminDashboard.guideOrgsUsers')}</li>
                      <li>{t('adminDashboard.guideReview')}</li>
                      <li>{t('adminDashboard.guideCategoriesQuestions')}</li>
                      <li>{t('adminDashboard.guideDocs')}</li>
                      <li>{t('adminDashboard.guideSupport')}</li>
                    </ul>
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full bg-dgrv-blue text-white hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/admin/guide");
                        }}
                      >
                        {t('adminDashboard.viewCompleteGuide')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
