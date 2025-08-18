/*
 * Custom hook for managing dashboard data and state
 * Fetches submissions, reports, and assessments data, provides dashboard actions
 * Handles user role-based visibility and navigation functions
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/shared/useAuth";
import {
  useOfflineSubmissions,
  useOfflineReports,
  useOfflineAssessments,
  useOfflineAdminSubmissions,
} from "@/hooks/useOfflineApi";
import { useInitialDataLoad } from "@/hooks/useInitialDataLoad";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
import { CheckSquare, FileText, Leaf, Users } from "lucide-react";
import type { Submission } from "../../openapi-rq/requests/types.gen";

type AuthUser = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  organizations?: Record<string, unknown>;
  realm_access?: { roles?: string[] };
  organisation_name?: string;
  organisation?: string;
};

export const useDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Always call both hooks to avoid React hooks violation
  const {
    data: userSubmissionsData,
    isLoading: userSubmissionsLoading,
    error: userSubmissionsError,
  } = useOfflineSubmissions();
  const {
    data: adminSubmissionsData,
    isLoading: adminSubmissionsLoading,
    error: adminSubmissionsError,
  } = useOfflineAdminSubmissions();
  const { data: reportsData, isLoading: reportsLoading } = useOfflineReports();
  const { data: assessmentsData } = useOfflineAssessments();

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

    const orgData = (
      user.organizations as Record<string, { id: string; categories: string[] }>
    )[orgKeys[0]];
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
      const isInOrganization =
        assessmentData.organization_id === organizationId ||
        assessmentData.org_id === organizationId;

      return isDraft && isInOrganization;
    });

    return filtered;
  }, [assessmentsData?.assessments, user?.organizations]);

  const submissions: Submission[] =
    submissionsData?.submissions?.slice(0, 5) || [];
  const reports = reportsData?.reports || [];

  useEffect(() => {
    if (submissionsError) {
      // Removed unnecessary error toast for loading submissions
    } else if (submissionsLoading) {
      // Removed unnecessary loading toast
    } else if (submissionsData) {
      // Removed unnecessary success toast for loaded submissions
    }
  }, [
    submissionsError,
    submissionsLoading,
    submissionsData,
    submissions.length,
    t,
  ]);

  const dashboardActions = [
    // Only org_admin can start new assessment
    ...(user?.roles?.includes("org_admin") ||
    user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.startAssessment.title"),
            description: t("user.dashboard.startAssessment.description"),
            icon: Leaf,
            color: "green" as const,
            onClick: () => navigate("/assessment/sustainability"),
          },
        ]
      : []),
    // Only Org_User sees 'Answer Assessment' card
    ...(!user?.roles?.includes("org_admin") &&
    !user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.answerAssessment.title"),
            description: t("user.dashboard.answerAssessment.description"),
            icon: FileText,
            color: "blue" as const,
            onClick: () => {
              // Navigate to assessment list page instead of directly to an assessment
              navigate("/user/assessment-list");
            },
          },
        ]
      : []),
    {
      title: t("user.dashboard.viewAssessments.title"),
      description: t("user.dashboard.viewAssessments.description"),
      icon: FileText,
      color: "blue" as const,
      onClick: () => navigate("/assessments"),
    },
    {
      title: t("user.dashboard.actionPlan.title"),
      description: t("user.dashboard.actionPlan.description"),
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => navigate("/action-plan"),
    },
    // Conditionally add Manage Users card for org admins
    ...(user?.roles?.includes("org_admin") ||
    user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.manageUsers.title"),
            description: t("user.dashboard.manageUsers.description"),
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
      case "reviewed":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "approved":
        return t("user.dashboard.status.approved");
      case "pending_review":
        return t("user.dashboard.status.pendingReview");
      case "under_review":
        return t("user.dashboard.status.underReview");
      case "rejected":
        return t("user.dashboard.status.rejected");
      case "revision_requested":
        return t("user.dashboard.status.revisionRequested");
      case "reviewed":
        return t("user.dashboard.status.reviewed", {
          defaultValue: "Reviewed",
        });
      default:
        return t("user.dashboard.status.unknown");
    }
  };

  const handleExportAllPDF = async () => {
    await exportAllAssessmentsPDF(reports);
  };

  // Get user name and organization name from user object (ID token)
  const userName =
    user?.name ||
    user?.preferred_username ||
    user?.email ||
    t("user.dashboard.user");
  let orgName = t("user.dashboard.org");
  let orgId = "";
  let categories: string[] = [];

  if (user?.organizations && typeof user.organizations === "object") {
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length > 0) {
      orgName = orgKeys[0]; // First organization name
      const orgData = (
        user.organizations as Record<
          string,
          { id: string; categories: string[] }
        >
      )[orgName];
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

  const handleViewAll = () => navigate("/assessments");
  const handleViewGuide = () => navigate("/user/guide");

  return {
    // State
    submissionsLoading,
    reportsLoading,

    // Data
    submissions,
    reports,
    filteredAssessments,
    user,

    // Computed values
    userName,
    orgName,
    orgId,
    categories,
    isOrgAdmin,

    // Functions
    dashboardActions,
    getStatusColor,
    formatStatus,
    handleExportAllPDF,
    handleViewAll,
    handleViewGuide,
  };
};
