/**
 * @file AssessmentsHeader.tsx
 * @description This file defines the header component for the Assessments page.
 */
import { FileText } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export const AssessmentsHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <FileText className="w-8 h-8 text-dgrv-blue" />
        <h1 className="text-3xl font-bold text-dgrv-blue">
          {t("yourSubmissions", { defaultValue: "Your Submissions" })}
        </h1>
      </div>
      <p className="text-lg text-gray-600">
        {t(
          "dashboard.assessments.subtitle",
          "View and manage all your sustainability submissions"
        )}
      </p>
    </div>
  );
};