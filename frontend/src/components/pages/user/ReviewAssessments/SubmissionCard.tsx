/**
 * @file SubmissionCard.tsx
 * @description This file defines the SubmissionCard component for displaying a single submission for review.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { OfflineSubmission } from "@/types/offline";
import { CheckCircle, Clock, Eye, FileText, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SubmissionCardProps {
  submission: OfflineSubmission;
  organizationsMap: Map<string, string>;
  onReview: (submission: OfflineSubmission) => void;
}

const getStatusBadge = (
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  switch (status) {
    case "under_review":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          {t("reviewAssessments.underReview", { defaultValue: "Under Review" })}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t("reviewAssessments.approved", { defaultValue: "Approved" })}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {t("reviewAssessments.rejected", { defaultValue: "Rejected" })}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const SubmissionCard: React.FC<SubmissionCardProps> = ({
  submission,
  organizationsMap,
  onReview,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      key={submission.submission_id}
      className="hover:shadow-md transition-shadow"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {submission.assessment_name ||
                  t("reviewAssessments.unknownAssessment", {
                    defaultValue: "Unknown Assessment",
                  })}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {t("reviewAssessments.organization", {
                  defaultValue: "Organization",
                })}
                :{" "}
                {organizationsMap.get(submission.organization_id) ||
                  t("reviewAssessments.unknownOrganization", {
                    defaultValue: "Unknown Organization",
                  })}
              </p>
              <p className="text-sm text-gray-600">
                {t("reviewAssessments.submitted", {
                  defaultValue: "Submitted",
                })}
                : {new Date(submission.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusBadge(submission.review_status, t)}
            <Button
              onClick={() => onReview(submission)}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{t("reviewAssessments.review", { defaultValue: "Review" })}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};