/**
 * @file NoCategories.tsx
 * @description This file defines the component to display when a user has no categories for an assessment.
 */
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const NoCategories: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t(
            "assessment.noCategoriesTitle",
            "No Categories Available"
          )}
        </h2>
        <p className="text-gray-600 mb-4">
          {t(
            "assessment.noCategoriesDescription",
            "This assessment doesn't have any categories assigned to you, or there are no matching categories between your assigned categories and the assessment's categories. Please contact your organization administrator."
          )}
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          {t("assessment.backToDashboard", "Back to Dashboard")}
        </Button>
      </div>
    </div>
  );
};