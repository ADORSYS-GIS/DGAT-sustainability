/**
 * @file DashboardActions.tsx
 * @description This file defines the dashboard actions component.
 */
import { FeatureCard } from "@/components/shared/FeatureCard";
import {
  CheckSquare,
  FileText,
  Leaf,
  Users,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface AuthUser {
  roles?: string[];
  realm_access?: {
    roles?: string[];
  };
}

interface DashboardActionsProps {
  user: AuthUser | null;
}

export const DashboardActions: React.FC<DashboardActionsProps> = ({
  user,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const dashboardActions = [
    // 1. Start Assessment (org_admin)
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
    // Answer Assessment (Org_User)
    ...(!user?.roles?.includes("org_admin") &&
    !user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.answerAssessment.title"),
            description: t("user.dashboard.answerAssessment.description"),
            icon: FileText,
            color: "blue" as const,
            onClick: () => navigate("/user/assessment-list"),
          },
        ]
      : []),
    // 2. Manage Users (org_admin)
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
    // 3. Draft Submissions (org_admin)
    ...(user?.roles?.includes("org_admin") ||
    user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.draftSubmissions.title"),
            description: t("user.dashboard.draftSubmissions.description"),
            icon: CheckSquare,
            color: "green" as const,
            onClick: () => navigate("/user/draft-submissions"),
          },
        ]
      : []),
    // 4. Review Assessments (org_admin)
    ...(user?.roles?.includes("org_admin") ||
    user?.realm_access?.roles?.includes("org_admin")
      ? [
          {
            title: t("user.dashboard.reviewAssessments.title"),
            description: t("user.dashboard.reviewAssessments.description"),
            icon: CheckSquare,
            color: "blue" as const,
            onClick: () => navigate("/user/reviews"),
          },
        ]
      : []),
    // 5. View Assessments (all users)
    {
      title: t("user.dashboard.viewAssessments.title"),
      description: t("user.dashboard.viewAssessments.description"),
      icon: FileText,
      color: "green" as const,
      onClick: () => navigate("/assessments"),
    },
    // 6. Action Plan (all users)
    {
      title: t("user.dashboard.actionPlan.title"),
      description: t("user.dashboard.actionPlan.description"),
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => navigate("/action-plan"),
    },
  ];

  return (
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
  );
};