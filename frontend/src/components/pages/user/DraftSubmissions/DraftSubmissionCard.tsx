/**
 * @file DraftSubmissionCard.tsx
 * @description This file defines the component for displaying a single draft submission.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Calendar,
  Eye,
  FileText,
  Users,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { DraftSubmission } from "./types";

interface DraftSubmissionCardProps {
  submission: DraftSubmission;
  onViewDetails: (submission: DraftSubmission) => void;
}

export const DraftSubmissionCard: React.FC<DraftSubmissionCardProps> = ({
  submission,
  onViewDetails,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      key={submission.submission_id}
      className="border-0 shadow-sm hover:shadow-md transition-shadow"
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  {submission.org_name}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 border-amber-200"
              >
                {submission.review_status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>
                  {submission.assessment_name ||
                    t("user.draftSubmissions.assessment", {
                      defaultValue: "Assessment",
                    })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {t("user.draftSubmissions.submitted", {
                    defaultValue: "Submitted",
                  })}{" "}
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>
                  {submission.content?.responses?.length || 0}{" "}
                  {t("user.draftSubmissions.responses", {
                    defaultValue: "responses",
                  })}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onViewDetails(submission)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("user.draftSubmissions.viewDetails", {
              defaultValue: "View Details",
            })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};