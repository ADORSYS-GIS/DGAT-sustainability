/**
 * @file NoAssessments.tsx
 * @description This file defines the component to display when no assessments are available.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const NoAssessments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="text-center py-12">
      <CardContent>
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t(
            "assessment.noAssessmentsAvailable",
            "No Assessments Available"
          )}
        </h2>
        <p className="text-gray-600 mb-4">
          {t(
            "assessment.noAssessmentsDescription",
            "No draft assessments are available for you to answer. Please contact your organization administrator to create an assessment."
          )}
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          {t("assessment.backToDashboard", "Back to Dashboard")}
        </Button>
      </CardContent>
    </Card>
  );
};