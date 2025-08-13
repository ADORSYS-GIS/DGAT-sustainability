/*
 * Empty state component for assessments page
 * Displays message when no submissions are available
 */

import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

export const EmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="text-center py-12">
      <CardContent>
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("noSubmissions", { defaultValue: "No Submissions" })}
        </h3>
        <p className="text-gray-600 mb-6">
          {t("dashboard.assessments.emptyState", { defaultValue: "Start your first sustainability assessment to track your cooperative's progress." })}
        </p>
      </CardContent>
    </Card>
  );
}; 