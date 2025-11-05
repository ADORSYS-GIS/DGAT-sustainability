import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/shared/useAuth";
import { ArrowLeft, FileText } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useOfflineUserSubmissions } from "@/hooks/useOfflineUserSubmissions";
import { OfflineSubmission } from "@/types/offline";

export const AssessmentSubmissionsList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: submissionsData, isLoading: submissionsLoading } = useOfflineUserSubmissions();

  const availableSubmissions = React.useMemo(() => {
    return submissionsData?.submissions || [];
  }, [submissionsData]);

  const handleSelectSubmission = (submissionId: string) => {
    navigate(`/action-plan/submission/${submissionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToDashboard", { defaultValue: "Back to Dashboard" })}</span>
            </Button>
            
            <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
              {t('assessment.selectAssessmentToViewActionPlan', { defaultValue: 'Select Assessment to View Action Plan' })}
            </h1>
            <p className="text-lg text-gray-600">
              {t('assessment.selectAssessmentToActionPlanDescription', { defaultValue: 'Choose an assessment to view the action plan.' })}
            </p>
          </div>

          {submissionsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-dgrv-blue"></div>
            </div>
          ) : availableSubmissions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {t("assessment.noSubmissionsAvailable", { defaultValue: "No Submissions Available" })}
                </h2>
                <p className="text-gray-600 mb-4">
                  {t("assessment.noSubmissionsDescription", {
                    defaultValue: "No submissions are available to view action plans.",
                  })}
                </p>
                <Button onClick={() => navigate("/dashboard")}>
                  {t("assessment.backToDashboard", { defaultValue: "Back to Dashboard" })}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSubmissions.map((submission) => (
                <Card
                  key={submission.submission_id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectSubmission(submission.submission_id)}
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-dgrv-blue mb-2">{submission.assessment_name}</h3>
                    <p className="text-sm text-gray-600">
                      {t('assessment.submittedOn', { defaultValue: 'Submitted on' })}: {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};