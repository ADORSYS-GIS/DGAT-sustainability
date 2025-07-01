import React from "react";
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
import { useOrganizations } from "@/hooks/shared/useOrganizations";
import { useUsers } from "@/hooks/shared/useUsers";
import { useAssessments } from "@/hooks/shared/useAssessments";
import { Organization } from "@/services/admin/organizationService";
import { User } from "@/services/admin/organizationService";
import { Assessment } from "@/services/user/assessmentService";

interface PendingReview {
  id: string;
  organization: string;
  user: string;
  type: string;
  submittedAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { data: orgs = [], isLoading: orgsLoading } = useOrganizations();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: assessments = [], isLoading: assessmentsLoading } =
    useAssessments();

  const [orgCount, setOrgCount] = React.useState(0);
  const [userCount, setUserCount] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [pendingReviews, setPendingReviews] = React.useState<PendingReview[]>(
    [],
  );

  React.useEffect(() => {
    if (orgsLoading || usersLoading || assessmentsLoading) return;
    // Calculate stats and pending reviews
    const pendingAssessments = (assessments as Assessment[]).filter(
      (a) => a.status === "submitted" || a.status === "under_review",
    );
    const completedCount = (assessments as Assessment[]).filter(
      (a) => a.status === "completed",
    ).length;
    const orgMap = new Map(
      (orgs as Organization[]).map((o) => [o.organizationId, o.name]),
    );
    const userMap = new Map(
      (users as User[]).map((u) => [
        u.userId,
        `${u.firstName ?? ""} ${u.lastName ?? ""}`,
      ]),
    );
    const reviewsData = pendingAssessments.map((assessment) => ({
      id: assessment.assessmentId,
      organization:
        orgMap.get(assessment.organizationId) || "Unknown Organization",
      user: userMap.get(assessment.userId) || "Unknown User",
      type: (assessment.templateId || "").toLowerCase().includes("dgat")
        ? "DGAT"
        : "Sustainability",
      submittedAt: new Date(assessment.createdAt).toLocaleDateString("en-CA"),
    }));
    setPendingReviews(reviewsData);
  }, [orgs, users, assessments, orgsLoading, usersLoading, assessmentsLoading]);

  React.useEffect(() => {
    setOrgCount(orgs.length);
    setUserCount(users.length);
    setPendingCount(
      (assessments as Assessment[]).filter(
        (a) => a.status === "submitted" || a.status === "under_review",
      ).length,
    );
    setCompletedCount(
      (assessments as Assessment[]).filter((a) => a.status === "completed")
        .length,
    );
  }, [orgs, users, assessments]);

  const adminActions = [
    {
      title: "Manage Organizations",
      description:
        "Add, edit, and manage cooperative organizations in the system.",
      icon: Users,
      color: "blue" as const,
      onClick: () => (window.location.href = "/admin/organizations"),
    },
    {
      title: "Manage Users",
      description: "Control user access and roles across all organizations.",
      icon: Users,
      color: "blue" as const,
      onClick: () => (window.location.href = "/admin/users"),
    },
    {
      title: "Manage Categories",
      description:
        "Configure assessment categories for DGAT and Sustainability tools.",
      icon: List,
      color: "green" as const,
      onClick: () => (window.location.href = "/admin/categories"),
    },
    {
      title: "Manage Questions",
      description: "Create and edit questions within each assessment category.",
      icon: BookOpen,
      color: "blue" as const,
      onClick: () => (window.location.href = "/admin/questions"),
    },
    {
      title: "Review Assessments",
      description: "Review submitted assessments and provide recommendations.",
      icon: CheckSquare,
      color: "green" as const,
      onClick: () => (window.location.href = "/admin/reviews"),
    },
    {
      title: "Standard Recommendations",
      description:
        "Manage reusable recommendations for common assessment scenarios.",
      icon: Star,
      color: "blue" as const,
      onClick: () => (window.location.href = "/admin/recommendations"),
    },
  ];

  const systemStats = [
    { label: "Active Organizations", value: orgCount, color: "blue" },
    { label: "Total Users", value: userCount, color: "green" },
    { label: "Pending Reviews", value: pendingCount, color: "yellow" },
    { label: "Completed Assessments", value: completedCount, color: "blue" },
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
                  {pendingReviews.length} pending
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
                          {review.type === "DGAT" ? (
                            <TrendingUp className="w-5 h-5 text-dgrv-blue" />
                          ) : (
                            <Star className="w-5 h-5 text-dgrv-green" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {review.type} Assessment
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
                          Review Required
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

            {/* System Health */}
            <div className="space-y-6">
              <Card
                className="animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-dgrv-green" />
                    <span>System Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Database</span>
                      <Badge className="bg-dgrv-green text-white">
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Response</span>
                      <Badge className="bg-dgrv-green text-white">Fast</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sync Queue</span>
                      <Badge className="bg-dgrv-green text-white">Clear</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-dgrv-blue">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">
                      Export System Report
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">
                      Backup Database
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">
                      View Audit Logs
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">
                      System Settings
                    </button>
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
