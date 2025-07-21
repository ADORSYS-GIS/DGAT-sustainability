import * as React from "react";
import { useMemo, useEffect, useState } from "react";
import { Navbar } from "@/components/shared/Navbar";
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
import { useAdminServiceGetAdminSubmissions } from "../../openapi-rq/queries/queries";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { get } from "idb-keyval";
import { useQuestionsServiceGetQuestions } from "../../openapi-rq/queries/queries";

type Organization = { organizationId: string; name: string };
type User = { userId: string; firstName?: string; lastName?: string };

interface PendingReview {
  id: string;
  organization: string;
  user: string;
  type: string;
  submittedAt: string;
}

export const AdminDashboard: React.FC = () => {
  const [orgs] = React.useState<Organization[]>([
    { organizationId: "org1", name: "Mock Cooperative 1" },
    { organizationId: "org2", name: "Mock Cooperative 2" },
  ]);
  const [users] = React.useState<User[]>([
    { userId: "user1", firstName: "Alice", lastName: "Smith" },
    { userId: "user2", firstName: "Bob", lastName: "Jones" },
  ]);
  const orgsLoading = false;
  const usersLoading = false;

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    isError,
    error,
    isSuccess,
  } = useAdminServiceGetAdminSubmissions();
  const submissions: AdminSubmissionDetail[] = React.useMemo(
    () => submissionsData?.submissions ?? [],
    [submissionsData],
  );

  React.useEffect(() => {
    if (isError) {
      toast.error("Error loading submissions", {
        description: error instanceof Error ? error.message : String(error),
      });
    } else if (submissionsLoading) {
      toast.info("Loading submissions...", {
        description: "Fetching latest submission data.",
      });
    } else if (isSuccess) {
      toast.success(`Loaded ${submissions.length} submissions successfully!`, {
        className: "bg-dgrv-green text-white",
      });
    }
  }, [isError, error, submissionsLoading, isSuccess, submissions.length]);

  const pendingReviews = useMemo(() => {
    if (orgsLoading || usersLoading || submissionsLoading) return [];

    // Include both 'pending_review' and 'under_review' statuses
    const pendingSubmissions = submissions.filter(
      (s) =>
        s.review_status === "pending_review" ||
        s.review_status === "under_review",
    );
    const userMap = new Map(
      users.map((u) => [u.userId, `${u.firstName ?? ""} ${u.lastName ?? ""}`]),
    );

    return pendingSubmissions.map((submission) => ({
      id: submission.submission_id,
      organization: "Unknown Organization",
      user: userMap.get(submission.user_id) || "Unknown User",
      type: "Sustainability",
      submittedAt: new Date(submission.submitted_at).toLocaleDateString(
        "en-CA",
      ),
      reviewStatus: submission.review_status,
    }));
  }, [users, submissions, orgsLoading, usersLoading, submissionsLoading]);

  // Dynamic pending reviews count (pending_review or under_review)
  const pendingReviewsCount = React.useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.review_status === "pending_review" ||
          s.review_status === "under_review",
      ).length,
    [submissions],
  );
  const completedCount = React.useMemo(
    () => submissions.filter((s) => s.review_status === "approved").length,
    [submissions],
  );

  const navigate = useNavigate();
  const keycloakAdminUrl = import.meta.env.VITE_KEYCLOAK_ADMIN_URL;
  const adminActions = [
    {
      title: "Manage Organizations",
      description:
        "Add, edit, and manage cooperative organizations in the system.",
      icon: Users,
      color: "blue" as const,
      onClick: () => navigate("/admin/organizations"),
    },
    {
      title: "Manage Users",
      description: "Control user access and roles across all organizations.",
      icon: Users,
      color: "blue" as const,
      onClick: () => navigate("/admin/users"),
    },
    {
      title: "Manage Categories",
      description: "Configure assessment categories for sustainability tools.",
      icon: List,
      color: "green" as const,
      onClick: () => navigate("/admin/categories"),
    },
    {
      title: "Manage Questions",
      description: "Create and edit questions within each assessment category.",
      icon: BookOpen,
      color: "blue" as const,
      onClick: () => navigate("/admin/questions"),
    },
    {
      title: "Review Assessments",
      description: "Review submitted assessments and provide recommendations.",
      icon: CheckSquare,
      color: "green" as const,
      onClick: () => navigate("/admin/reviews"),
    },
    {
      title: "Standard Recommendations",
      description:
        "Manage reusable recommendations for common assessment scenarios.",
      icon: Star,
      color: "blue" as const,
      onClick: () => navigate("/admin/recommendations"),
    },
  ];

  // Dynamic counts for categories and questions
  const [categoryCount, setCategoryCount] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number>(0);

  // Fetch categories count from IndexedDB
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = (await get("sustainability_categories")) as
          | { categoryId: string }[]
          | undefined;
        setCategoryCount(cats ? cats.length : 0);
      } catch {
        setCategoryCount(0);
      }
    };
    fetchCategories();
  }, []);

  // Fetch questions count from API
  const { data: questionsData } = useQuestionsServiceGetQuestions();
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

  const systemStats = [
    { label: "Number of Categories", value: categoryCount, color: "blue" },
    { label: "Number of Questions", value: questionCount, color: "green" },
    { label: "Pending Reviews", value: pendingReviewsCount, color: "yellow" },
    {
      label: "Completed Assessments",
      value: completedCount,
      color: "blue",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Welcome, Admin! Drive Cooperative Impact!
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Manage the DGRV assessment platform and support cooperatives
              across Southern Africa.
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
                    {stat.value}
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
                  <span>Pending Reviews</span>
                </CardTitle>
                <Badge className="bg-orange-500 text-white">
                  {pendingReviewsCount} pending
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingReviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
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
                          <p className="text-xs text-gray-500">
                            by {review.user}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {review.submittedAt}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {review.reviewStatus === "under_review"
                            ? "Under Review"
                            : "Review Required"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {pendingReviews.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>All assessments are up to date!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Guide */}
            <div className="space-y-6">
              <Card
                className="animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-dgrv-blue" />
                    <span>Admin Guide</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      Welcome to the DGRV Admin Dashboard! Here are some tips to
                      help you manage the platform:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Use the{" "}
                        <span className="font-semibold text-dgrv-blue">
                          Manage Organizations
                        </span>{" "}
                        and{" "}
                        <span className="font-semibold text-dgrv-blue">
                          Manage Users
                        </span>{" "}
                        sections to control access and membership.
                      </li>
                      <li>
                        Review and approve assessments in the{" "}
                        <span className="font-semibold text-dgrv-blue">
                          Review Assessments
                        </span>{" "}
                        section.
                      </li>
                      <li>
                        Configure categories and questions to tailor the
                        assessment process to your needs.
                      </li>
                      <li>
                        For detailed documentation, visit{" "}
                        <a
                          href="https://dgrv-admin-docs.example.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          Admin Documentation
                        </a>
                        .
                      </li>
                      <li>
                        If you need help, contact{" "}
                        <a
                          href="mailto:support@dgrv.org"
                          className="text-blue-600 underline"
                        >
                          support@dgrv.org
                        </a>
                        .
                      </li>
                    </ul>
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
