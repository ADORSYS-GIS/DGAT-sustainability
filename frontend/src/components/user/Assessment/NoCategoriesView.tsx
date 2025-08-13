/*
 * No categories view component for assessment interface
 * Displays message when no assessment categories are available
 */

import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NoCategoriesViewProps {
  onBackToDashboard: () => void;
}

export const NoCategoriesView: React.FC<NoCategoriesViewProps> = ({ 
  onBackToDashboard 
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("assessment.noCategoriesTitle", { defaultValue: "No Categories Available" })}
        </h2>
        <p className="text-gray-600 mb-4">
          {t("assessment.noCategoriesDescription", {
            defaultValue: "No assessment categories have been assigned to your account. Please contact your organization administrator.",
          })}
        </p>
        <Button onClick={onBackToDashboard}>
          {t("assessment.backToDashboard", { defaultValue: "Back to Dashboard" })}
        </Button>
      </div>
    </div>
  );
}; 