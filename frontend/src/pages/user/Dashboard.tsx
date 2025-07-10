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
} from "lucide-react";
import React from "react";
import { useSubmissionsServiceGetSubmissions } from "../..//openapi-rq//queries/queries";
import type { Submission } from "../../openapi-rq/requests/types.gen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, isSuccess } =
    useSubmissionsServiceGetSubmissions();
  const submissions: Submission[] = data?.submissions?.slice(0, 3) || [];

  React.useEffect(() => {
    if (isError) {
      toast.error(t("dashboard.error_loading"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } else if (isLoading) {
      toast.info(t("dashboard.loading"), {
        description: t("dashboard.loading_desc"),
      });
    } else if (isSuccess) {
      toast.success(t("dashboard.success"), {
        description: t("dashboard.success_desc", { count: submissions.length }),
        className: "bg-dgrv-green text-white",
      });
    }
  }, [isError, error, isLoading, isSuccess, submissions.length, t]);

  const dashboardActions = [
    {
      title: t("dashboard.actions.start"),
      description: t("dashboard.actions.start_desc"),
      icon: Leaf,
      color: "green" as const,
      onClick: () => navigate("/assessment/sustainability"),
    },
    {
      title: t("dashboard.actions.view"),
      description: t("dashboard.actions.view_desc"),
      icon: FileText,
      color: "blue" as const,
      onClick: () => navigate("/assessments"),
    },
    {
      title: t("dashboard.actions.plan"),
      description: t("dashboard.actions.plan_desc"),
      icon: CheckSquare,
      color: "blue" as const,
      onClick: () => navigate("/action-plan"),
    },
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
        return t("dashboard.statuses.approved");
      case "pending_review":
        return t("dashboard.statuses.pending_review");
      case "under_review":
        return t("dashboard.statuses.under_review");
      case "rejected":
        return t("dashboard.statuses.rejected");
      case "revision_requested":
        return t("dashboard.statuses.revision_requested");
      default:
        return t("dashboard.statuses.unknown");
    }
  };

  const handleExportAllPDF = async () => {
    await exportAllAssessmentsPDF(submissions, undefined, formatStatus);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <Star className="w-8 h-8 text-dgrv-green" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                {t("dashboard.welcome")}
              </h1>
            </div>
            <p className="text-lg text-gray-600">{t("dashboard.ready")}</p>
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
                  <span>{t("dashboard.recent")}</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/assessments")}
                >
                  {t("dashboard.view_all")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t("dashboard.loading")}</p>
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
                              {t("dashboard.assessment")}
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
                      <p>{t("dashboard.no_submissions")}</p>
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
                    <span>{t("dashboard.export_reports")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("dashboard.export_desc")}
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleExportAllPDF}
                    >
                      {t("dashboard.export_pdf")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {t("dashboard.export_word")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      {t("dashboard.export_csv")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <CardHeader>
                  <CardTitle className="text-dgrv-green">
                    {t("dashboard.need_help")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("dashboard.help_desc")}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("dashboard.user_guide")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
