/**
 * @file NoSubmissions.tsx
 * @description This file defines the NoSubmissions component for displaying a message when there are no submissions to review.
 */
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NoSubmissions: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="text-center py-12">
      <CardContent>
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("reviewAssessments.noSubmissionsUnderReview", {
            defaultValue: "No submissions under review",
          })}
        </h3>
        <p className="text-gray-600">
          {t("reviewAssessments.submissionsUnderReview", {
            defaultValue: "Submissions under review will appear here",
          })}
        </p>
      </CardContent>
    </Card>
  );
};