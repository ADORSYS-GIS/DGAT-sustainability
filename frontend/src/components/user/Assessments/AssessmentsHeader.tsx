/*
 * Header component for assessments page
 * Displays title, description and manual sync button
 */

import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AssessmentsHeaderProps {
  onManualSync: () => void;
}

export const AssessmentsHeader: React.FC<AssessmentsHeaderProps> = ({
  onManualSync,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="w-8 h-8 text-dgrv-blue" />
          <h1 className="text-3xl font-bold text-dgrv-blue">
            {t("yourSubmissions", { defaultValue: "Your Submissions" })}
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          {t("dashboard.assessments.subtitle", {
            defaultValue: "View and manage all your sustainability submissions",
          })}
        </p>
      </div>
      <Button onClick={onManualSync} className="flex items-center space-x-2">
        <RefreshCw className="w-4 h-4" />
        {t("syncData", { defaultValue: "Sync Data" })}
      </Button>
    </div>
  );
};
