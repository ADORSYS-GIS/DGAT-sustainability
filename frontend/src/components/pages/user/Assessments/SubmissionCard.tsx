/**
 * @file SubmissionCard.tsx
 * @description This file defines the component for displaying a single submission.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Submission } from "@/openapi-rq/requests/types.gen";
import { Calendar, Eye, FileText, Trash2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavigateFunction } from "react-router-dom";

type SubmissionWithName = Submission & { assessment_name?: string };

interface SubmissionCardProps {
  submission: SubmissionWithName;
  index: number;
  onDelete: (submissionId: string) => void;
  isDeleting: boolean;
  isOrgAdmin: boolean;
  navigate: NavigateFunction;
}

const getCategoryCounts = (submission: SubmissionWithName) => {
  try {
    const responses = submission?.content?.responses || [];
    const completedCategories = new Set<string>();

    responses.forEach((response) => {
      const customResponse = response as unknown as {
        question_category?: string;
      };
      if (customResponse.question_category) {
        completedCategories.add(customResponse.question_category);
      }
    });
    return { completed: completedCategories.size };
  } catch (error) {
    console.warn("Error calculating category counts:", error);
    return { completed: 0 };
  }
};

export const SubmissionCard: React.FC<SubmissionCardProps> = ({
  submission,
  index,
  onDelete,
  isDeleting,
  isOrgAdmin,
  navigate,
}) => {
  const { t } = useTranslation();
  const { completed } = getCategoryCounts(submission);

  return (
    <Card
      key={submission.submission_id}
      className="animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-dgrv-green/10">
              <FileText className="w-5 h-5 text-dgrv-green" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {submission.assessment_name ||
                  `${t("sustainability")} ${t("assessment")} ${t(
                    "submission",
                    { defaultValue: "Submission" }
                  )}`}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t("submittedAt")}:{" "}
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center space-x-3">
            <Badge
              className={
                submission.review_status === "approved"
                  ? "bg-dgrv-green text-white"
                  : submission.review_status === "rejected"
                  ? "bg-red-500 text-white"
                  : submission.review_status === "under_review"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-500 text-white"
              }
            >
              {submission.review_status
                ? submission.review_status.charAt(0).toUpperCase() +
                  submission.review_status.slice(1).replace("_", " ")
                : "-"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>
              {t("category")} {t("completed", { defaultValue: "Completed" })}:{" "}
              {completed}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/submission-view/${submission.submission_id}`)
              }
            >
              <Eye className="w-4 h-4 mr-1" />
              {t("viewSubmission")}
            </Button>
            {isOrgAdmin && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(submission.submission_id)}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {isDeleting
                  ? t("deleting", { defaultValue: "Deleting..." })
                  : t("delete", { defaultValue: "Delete" })}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};