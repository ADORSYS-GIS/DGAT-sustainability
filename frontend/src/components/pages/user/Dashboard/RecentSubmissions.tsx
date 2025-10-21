/**
 * @file RecentSubmissions.tsx
 * @description This file defines the component for displaying recent submissions.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Submission } from "@/openapi-rq/requests/types.gen";
import { History, Leaf } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface RecentSubmissionsProps {
  submissions: Submission[];
  isLoading: boolean;
}

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

const formatStatus = (status: string, t: (key: string) => string) => {
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
      return t("user.dashboard.status.reviewed");
    default:
      return t("user.dashboard.status.unknown");
  }
};

export const RecentSubmissions: React.FC<RecentSubmissionsProps> = ({
  submissions,
  isLoading,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="lg:col-span-2 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <History className="w-5 h-5 text-dgrv-blue" />
          <span>{t("user.dashboard.recentSubmissions")}</span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/assessments")}
        >
          {t("user.dashboard.viewAll")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("user.dashboard.loadingSubmissionsInline")}</p>
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
                      {submission.assessment_name ||
                        t("user.dashboard.sustainabilityAssessment")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(submission.review_status)}>
                    {formatStatus(submission.review_status, t)}
                  </Badge>
                </div>
              </div>
            ))
          )}
          {submissions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("user.dashboard.noSubmissions")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};