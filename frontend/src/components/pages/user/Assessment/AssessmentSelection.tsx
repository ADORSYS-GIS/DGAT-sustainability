/**
 * @file AssessmentSelection.tsx
 * @description This file defines the component for selecting or creating an assessment.
 */
import { AssessmentList } from "@/components/shared/AssessmentList";
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { Button } from "@/components/ui/button";
import { useOfflineDraftAssessments } from "@/hooks/useOfflineAssessments";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface AssessmentSelectionProps {
  isOrgAdmin: boolean;
  onSelectAssessment: (assessmentId: string) => void;
  onCreateAssessment: (
    assessmentName: string,
    categories?: string[]
  ) => Promise<void>;
  isCreatingAssessment: boolean;
}

export const AssessmentSelection: React.FC<AssessmentSelectionProps> = ({
  isOrgAdmin,
  onSelectAssessment,
  onCreateAssessment,
  isCreatingAssessment,
}) => {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments,
  } = useOfflineDraftAssessments();

  return (
    <div className="pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
            {t("assessment.selectAssessment", "Select Assessment")}
          </h1>
          <p className="text-lg text-gray-600">
            {t(
              "assessment.selectAssessmentDescription",
              "Choose an assessment to continue or create a new one."
            )}
          </p>
        </div>

        {isOrgAdmin && (
          <div className="mb-6">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-dgrv-blue hover:bg-blue-700"
            >
              {t("assessment.createNewAssessment", "Create New Assessment")}
            </Button>
          </div>
        )}

        <AssessmentList
          assessments={assessmentsData?.assessments || []}
          onSelectAssessment={onSelectAssessment}
          isLoading={assessmentsLoading}
          onAssessmentDeleted={refetchAssessments}
        />

        <CreateAssessmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateAssessment}
          isLoading={isCreatingAssessment}
          isOrgAdmin={isOrgAdmin}
        />
      </div>
    </div>
  );
};