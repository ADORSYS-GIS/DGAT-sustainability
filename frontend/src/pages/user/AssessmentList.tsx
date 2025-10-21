/**
 * @file AssessmentList.tsx
 * @description This file defines the main component for the Assessment List page.
 */
import { AssessmentList as AssessmentListComponent } from "@/components/shared/AssessmentList";
import { Navbar } from "@/components/shared/Navbar";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineDraftAssessments } from "@/hooks/useOfflineAssessments";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AssessmentListHeader } from "@/components/pages/user/AssessmentList/AssessmentListHeader";
import { NoAssessments } from "@/components/pages/user/AssessmentList/NoAssessments";

export const AssessmentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments,
  } = useOfflineDraftAssessments();

  const availableAssessments = React.useMemo(() => {
    if (!assessmentsData?.assessments || !user?.organizations) {
      return [];
    }

    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) {
      return [];
    }

    const orgData = (
      user.organizations as Record<string, { id: string; categories: string[] }>
    )[orgKeys[0]];
    const organizationId = orgData?.id;

    if (!organizationId) {
      return [];
    }

    const filtered = assessmentsData.assessments.filter((assessment) => {
      const isInOrganization =
        assessment.org_id === organizationId ||
        assessment.organization_id === organizationId;
      return isInOrganization;
    });

    return filtered;
  }, [assessmentsData?.assessments, user?.organizations]);

  const handleSelectAssessment = (selectedAssessmentId: string) => {
    navigate(`/user/assessment/${selectedAssessmentId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AssessmentListHeader />
          {availableAssessments.length === 0 && !assessmentsLoading ? (
            <NoAssessments />
          ) : (
            <AssessmentListComponent
              assessments={availableAssessments}
              onSelectAssessment={handleSelectAssessment}
              isLoading={assessmentsLoading}
              onAssessmentDeleted={refetchAssessments}
            />
          )}
        </div>
      </div>
    </div>
  );
};