// /frontend/src/pages/admin/AdminDashboard.tsx
/**
 * @file Admin Dashboard page.
 * @description This page provides an overview of the system and access to various admin functions.
 */
import AdminGuide from '@/components/pages/admin/AdminDashboard/AdminGuide';
import ManagementActions from '@/components/pages/admin/AdminDashboard/ManagementActions';
import SystemStats from '@/components/pages/admin/AdminDashboard/SystemStats';
import WelcomeHeader from '@/components/pages/admin/AdminDashboard/WelcomeHeader';
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { useOfflineAdminSubmissions } from "@/hooks/useOfflineAdminSubmissions";
import { useOfflineOrganizations } from "@/hooks/useOfflineOrganizations";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import {
  BookOpen,
  Kanban,
  List,
  TrendingUp,
  Users
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { data: submissionsData, isLoading: submissionsLoading, error, refetch: refetchSubmissions } = useOfflineAdminSubmissions();
  
  const submissions = submissionsData?.submissions || [];
  
  React.useEffect(() => {
    refetchSubmissions();
  }, [refetchSubmissions]);
  
  const approvedSubmissions = submissions.filter(
    submission => submission.review_status === 'approved'
  );
  
  const rejectedSubmissions = submissions.filter(
    submission => submission.review_status === 'rejected'
  );
  
  const reviewedSubmissions = submissions.filter(
    submission => (submission.review_status as string) === 'reviewed'
  );
  
  const completedCount = useMemo(
    () =>
      approvedSubmissions.length + rejectedSubmissions.length + reviewedSubmissions.length,
    [approvedSubmissions, rejectedSubmissions, reviewedSubmissions],
  );

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

  const { data: categoriesData, isLoading: categoriesLoading } = useOfflineCategoryCatalogs();
  const categoryCount = categoriesData?.length || 0;

  const { data: questionsData, isLoading: questionsLoading } = useOfflineQuestions();
  const questionCount = questionsData?.length || 0;

  const { organizations, isLoading: organizationsLoading } = useOfflineOrganizations();
  const organizationCount = organizations?.length || 0;

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
          <WelcomeHeader />
          <SystemStats stats={systemStats} />
          <ManagementActions actions={adminActions} />
          <div className="grid lg:grid-cols-1 gap-8">
            <AdminGuide />
          </div>
        </div>
      </div>
    </div>
  );
};
