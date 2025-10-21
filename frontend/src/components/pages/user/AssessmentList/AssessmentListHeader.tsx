/**
 * @file AssessmentListHeader.tsx
 * @description This file defines the header component for the Assessment List page.
 */
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const AssessmentListHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <Button
        variant="outline"
        onClick={() => navigate("/dashboard")}
        className="mb-4 flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>
          {t("backToDashboard", { defaultValue: "Back to Dashboard" })}
        </span>
      </Button>

      <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
        {t(
          "assessment.selectAssessmentToAnswer",
          "Select Assessment to Answer"
        )}
      </h1>
      <p className="text-lg text-gray-600">
        {t(
          "assessment.selectAssessmentDescription",
          "Choose an assessment to answer the questions."
        )}
      </p>
    </div>
  );
};