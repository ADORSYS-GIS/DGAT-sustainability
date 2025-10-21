/**
 * @file Header.tsx
 * @description This file defines the Header component for the ReviewAssessments page.
 */
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  pendingReviewsCount: number;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingReviewsCount,
  onBack,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {t("reviewAssessments.backToDashboard", {
              defaultValue: "Back to Dashboard",
            })}
          </span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("reviewAssessments.title", {
              defaultValue: "Review Assessments",
            })}
          </h1>
          <p className="text-gray-600">
            {t("reviewAssessments.subtitle", {
              defaultValue: "Review and approve submitted assessments",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {pendingReviewsCount > 0 && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4" />
            <span>
              {pendingReviewsCount}{" "}
              {t("reviewAssessments.pendingSync", {
                defaultValue: "Pending Sync",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};