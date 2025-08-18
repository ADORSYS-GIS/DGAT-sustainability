import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useOfflineAdminSubmissions,
  useOfflineQuestions,
  useOfflineCategories,
} from "@/hooks/useOfflineApi";
import { Users, List, BookOpen, Star, CheckSquare } from "lucide-react";

interface PendingReview {
  id: string;
  organization: string;
  type: string;
  submittedAt: string;
  reviewStatus: string;
}

interface SystemStat {
  label: string;
  value: number;
  color: string;
  loading: boolean;
}

interface AdminAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green";
  onClick: () => void;
}

export const useAdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useOfflineAdminSubmissions();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useOfflineCategories();
  const { data: questionsData, isLoading: questionsLoading } =
    useOfflineQuestions();

  const [questionCount, setQuestionCount] = useState<number>(0);

  const submissions = submissionsData?.submissions || [];

  useEffect(() => {
    refetchSubmissions();

    // Refetch when window gains focus (user returns to tab)
    const handleFocus = () => {
      refetchSubmissions();
    };

    // Refetch every 30 seconds to keep data fresh
    const interval = setInterval(() => {
      refetchSubmissions();
    }, 30000);

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [refetchSubmissions]);

  const pendingSubmissions = submissions.filter(
    (submission) =>
      submission.review_status === "under_review" ||
      submission.review_status === "pending_review",
  );

  const approvedSubmissions = submissions.filter(
    (submission) => submission.review_status === "approved",
  );

  const rejectedSubmissions = submissions.filter(
    (submission) => submission.review_status === "rejected",
  );

  // Also include 'reviewed' status as completed
  const reviewedSubmissions = submissions.filter(
    (submission) => submission.review_status === "reviewed",
  );

  const pendingReviews = useMemo(() => {
    if (submissionsLoading) return [];

    return pendingSubmissions.map((submission) => ({
      id: submission.submission_id,
      organization: submission.org_name || t("unknownOrganization"),
      type: "Sustainability",
      submittedAt: new Date(submission.submitted_at).toLocaleDateString(
        "en-CA",
      ),
      reviewStatus: submission.review_status,
    }));
  }, [submissionsLoading, pendingSubmissions, t]);

  const pendingReviewsCount = useMemo(
    () => pendingSubmissions.length,
    [pendingSubmissions],
  );

  const completedCount = useMemo(
    () =>
      approvedSubmissions.length +
      rejectedSubmissions.length +
      reviewedSubmissions.length,
    [approvedSubmissions, rejectedSubmissions, reviewedSubmissions],
  );

  const categoryCount = categoriesData?.categories?.length || 0;

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

  const systemStats: SystemStat[] = [
    {
      label: t("adminDashboard.numCategories"),
      value: categoryCount,
      color: "blue",
      loading: categoriesLoading,
    },
    {
      label: t("adminDashboard.numQuestions"),
      value: questionCount,
      color: "green",
      loading: questionsLoading,
    },
    {
      label: t("adminDashboard.pendingReviews"),
      value: pendingReviewsCount,
      color: "yellow",
      loading: submissionsLoading,
    },
    {
      label: t("adminDashboard.completedAssessments"),
      value: completedCount,
      color: "blue",
      loading: submissionsLoading,
    },
  ];

  const adminActions: AdminAction[] = [
    {
      title: t("adminDashboard.manageOrganizations"),
      description: t("adminDashboard.manageOrganizationsDesc"),
      icon: Users,
      color: "blue",
      onClick: () => navigate("/admin/organizations"),
    },
    {
      title: t("adminDashboard.manageUsers"),
      description: t("adminDashboard.manageUsersDesc"),
      icon: Users,
      color: "blue",
      onClick: () => navigate("/admin/users"),
    },
    {
      title: t("adminDashboard.manageCategories"),
      description: t("adminDashboard.manageCategoriesDesc"),
      icon: List,
      color: "green",
      onClick: () => navigate("/admin/categories"),
    },
    {
      title: t("adminDashboard.manageQuestions"),
      description: t("adminDashboard.manageQuestionsDesc"),
      icon: BookOpen,
      color: "blue",
      onClick: () => navigate("/admin/questions"),
    },
    {
      title: t("adminDashboard.reviewAssessments"),
      description: t("adminDashboard.reviewAssessmentsDesc"),
      icon: CheckSquare,
      color: "green",
      onClick: () => navigate("/admin/reviews"),
    },
    {
      title: t("adminDashboard.standardRecommendations"),
      description: t("adminDashboard.standardRecommendationsDesc"),
      icon: Star,
      color: "blue",
      onClick: () => navigate("/admin/recommendations"),
    },
  ];

  return {
    pendingReviews,
    pendingReviewsCount,
    systemStats,
    adminActions,
    isLoading: submissionsLoading || categoriesLoading || questionsLoading,
  };
};
