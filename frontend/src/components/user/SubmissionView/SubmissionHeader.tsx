/*
 * Displays the submission header with title, status, submitted date, and reviewed date
 * Shows submission metadata in a card format with responsive layout
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { Submission } from "@/openapi-rq/requests/types.gen";

interface SubmissionHeaderProps {
  submission: Submission;
}

export const SubmissionHeader: React.FC<SubmissionHeaderProps> = ({
  submission,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-md bg-white/90 border-0">
      <CardHeader className="border-b pb-2 mb-2">
        <CardTitle className="text-2xl font-bold text-dgrv-blue tracking-tight text-left">
          {t("viewSubmission")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0">
          <div className="flex-1">
            <span className="block text-xs text-gray-500 font-medium mb-1">
              {t("status")}
            </span>
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              {submission.review_status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <div className="flex-1">
            <span className="block text-xs text-gray-500 font-medium mb-1">
              {t("submittedAt")}
            </span>
            <span className="text-sm text-gray-700">
              {new Date(submission.submitted_at).toLocaleString()}
            </span>
          </div>
          {submission.reviewed_at && (
            <div className="flex-1">
              <span className="block text-xs text-gray-500 font-medium mb-1">
                {t("reviewedAt")}
              </span>
              <span className="text-sm text-gray-700">
                {new Date(submission.reviewed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
