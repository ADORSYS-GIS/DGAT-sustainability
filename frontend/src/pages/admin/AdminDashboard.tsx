import * as React from "react";
import { useMemo, useEffect, useState } from "react";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Settings,
  List,
  BookOpen,
  Star,
  CheckSquare,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import type { AdminSubmissionDetail } from "../../openapi-rq/requests/types.gen";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  useOfflineAdminSubmissions, 
  useOfflineQuestions, 
  useOfflineCategories,
  useOfflineSyncStatus 
} from "@/hooks/useOfflineApi";
import { useAuth } from "@/hooks/shared/useAuth";

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
  
  const totalSubmissions = submissions.length;

  const { isOnline } = useOfflineSyncStatus();

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
      organization: submission.org_name || "Unknown Organization",
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
      approvedSubmissions.length + rejectedSubmissions.length,
    [approvedSubmissions, rejectedSubmissions],
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
      title: t('adminDashboard.reviewAssessments'),
      description: t('adminDashboard.reviewAssessmentsDesc'),
      icon: CheckSquare,
      color: "green" as const,
      onClick: () => navigate("/admin/reviews"),
    },
    {
      title: t('adminDashboard.standardRecommendations'),
      description: t('adminDashboard.standardRecommendationsDesc'),
      icon: Star,
      color: "blue" as const,
      onClick: () => navigate("/admin/recommendations"),
    },
  ];

  // Dynamic counts for categories and questions using offline hooks
  const [questionCount, setQuestionCount] = useState<number>(0);

  // Fetch categories count from offline data
  const { data: categoriesData, isLoading: categoriesLoading } = useOfflineCategories();
  const categoryCount = categoriesData?.categories?.length || 0;

  // Fetch questions count from offline data
  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  function isQuestionsResponse(obj: unknown): obj is { questions: unknown[] } {
    return (
      typeof obj === "object" &&
      obj !== null &&
      Array.isArray((obj as { questions?: unknown[] }).questions)
    );
  }
  useEffect(() => {
    if (isQuestionsResponse(questionsData)) {
      setQuestionCount(questionsData.questions.length);
    }
  }, [questionsData]);

  // Check if any data is still loading
  const isDataLoading = submissionsLoading || categoriesLoading || questionsLoading;

  const systemStats = [
    { label: t('adminDashboard.numCategories'), value: categoryCount, color: "blue", loading: categoriesLoading },
    { label: t('adminDashboard.numQuestions'), value: questionCount, color: "green", loading: questionsLoading },
    { label: t('adminDashboard.pendingReviews'), value: pendingReviewsCount, color: "yellow", loading: submissionsLoading },
    {
      label: t('adminDashboard.completedAssessments'),
      value: completedCount,
      color: "blue",
      loading: submissionsLoading,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Offline Status Indicator */}
          <div className="mb-4 flex items-center justify-end">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

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
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Pending Reviews */}
            <Card className="lg:col-span-2 animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span>{t('adminDashboard.pendingReviewsCard')}</span>
                </CardTitle>
                <Badge className="bg-orange-500 text-white">
                  {submissionsLoading ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                      <span>...</span>
                    </div>
                  ) : (
                    `${pendingReviewsCount} ${t('adminDashboard.pendingCount', { count: pendingReviewsCount })}`
                  )}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dgrv-blue mx-auto mb-4"></div>
                      <p className="text-gray-600">{t('adminDashboard.loadingSubmissions', { defaultValue: 'Loading submissions...' })}</p>
                    </div>
                  ) : (
                    <>
                      {pendingReviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/admin/reviews`)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-2 rounded-full bg-gray-100">
                              {/* Assuming type is derived from submission or can be inferred */}
                              <Star className="w-5 h-5 text-dgrv-green" />
                            </div>
                            <div>
                              <h3 className="font-medium">
                                Sustainability Assessment
                              </h3>
                              <p className="text-sm text-gray-600">
                                {review.organization}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {review.submittedAt}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {review.reviewStatus === "under_review"
                                ? t('adminDashboard.underReview')
                                : t('adminDashboard.reviewRequired')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {pendingReviews.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>{t('adminDashboard.allUpToDate')}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Guide */}
            <div className="space-y-6">
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
                        View Complete Guide
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
