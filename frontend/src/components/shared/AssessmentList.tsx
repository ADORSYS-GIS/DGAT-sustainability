import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, FileText } from "lucide-react";
import type { OfflineAssessment } from "@/types/offline";

interface AssessmentListProps {
  assessments: OfflineAssessment[];
  onSelectAssessment: (assessmentId: string) => void;
  isLoading?: boolean;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  onSelectAssessment,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dgrv-blue"></div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("assessment.noDraftAssessmentsAvailable", {
            defaultValue: "No draft assessments available",
          })}
        </h3>
        <p className="text-gray-600">
          {t("assessment.noDraftAssessmentsDescription", {
            defaultValue: "No draft assessments have been created yet.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment) => (
        <Card
          key={assessment.assessment_id}
          className="hover:shadow-md transition-shadow"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-dgrv-blue" />
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {assessment.name ||
                      t("assessment.untitled", {
                        defaultValue: "Untitled Assessment",
                      })}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(assessment.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {t("assessment.status.draft", { defaultValue: "Draft" })}
                </Badge>
                <Button
                  onClick={() => onSelectAssessment(assessment.assessment_id)}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t("assessment.continueAssessment", {
                    defaultValue: "Continue",
                  })}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};
