/*
 * Assessment selection view component for choosing assessments
 * Displays available assessments and creation interface
 */

import { Button } from "@/components/ui/button";
import { AssessmentList } from "@/components/shared/AssessmentList";
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { useTranslation } from "react-i18next";
import type { OfflineAssessment } from "@/types/offline";

interface AssessmentSelectionViewProps {
  assessments: OfflineAssessment[];
  assessmentsLoading: boolean;
  canCreate: boolean;
  showCreateModal: boolean;
  isCreatingAssessment: boolean;
  onSelectAssessment: (assessmentId: string) => void;
  onCreateClick: () => void;
  onCloseCreateModal: () => void;
  onSubmitCreate: (assessmentName: string) => void;
}

export const AssessmentSelectionView: React.FC<
  AssessmentSelectionViewProps
> = ({
  assessments,
  assessmentsLoading,
  canCreate,
  showCreateModal,
  isCreatingAssessment,
  onSelectAssessment,
  onCreateClick,
  onCloseCreateModal,
  onSubmitCreate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
              {t("assessment.selectAssessment", {
                defaultValue: "Select Assessment",
              })}
            </h1>
            <p className="text-lg text-gray-600">
              {t("assessment.selectAssessmentDescription", {
                defaultValue:
                  "Choose an assessment to continue or create a new one.",
              })}
            </p>
          </div>

          {canCreate && (
            <div className="mb-6">
              <Button
                onClick={onCreateClick}
                className="bg-dgrv-blue hover:bg-blue-700"
              >
                {t("assessment.createNewAssessment", {
                  defaultValue: "Create New Assessment",
                })}
              </Button>
            </div>
          )}

          <AssessmentList
            assessments={assessments}
            onSelectAssessment={onSelectAssessment}
            isLoading={assessmentsLoading}
          />

          <CreateAssessmentModal
            isOpen={showCreateModal}
            onClose={onCloseCreateModal}
            onSubmit={onSubmitCreate}
            isLoading={isCreatingAssessment}
          />
        </div>
      </div>
    </div>
  );
};
