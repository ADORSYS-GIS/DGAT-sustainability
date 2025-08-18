/*
 * User assessments page that displays all user submissions
 * Shows submission history, status, and management options
 */

import * as React from "react";
import { Navbar } from "@/components/shared/Navbar";
import {
  AssessmentsHeader,
  SubmissionCard,
  EmptyState,
} from "@/components/user/Assessments";
import { LoadingState } from "@/components/shared";
import { useAssessments } from "@/hooks/user/useAssessments";

export const Assessments: React.FC = () => {
  const {
    // State
    isLoading,
    isDeleting,

    // Data
    submissions,
    user,

    // Functions
    getCategoryCounts,
    isOrgAdmin,
    handleDeleteSubmission,
    handleManualSync,
    handleViewSubmission,
  } = useAssessments();

  if (isLoading) {
    return <LoadingState message="Loading assessments..." showNavbar={true} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AssessmentsHeader onManualSync={handleManualSync} />

        <div className="grid gap-6">
          {submissions.map((submission, index) => (
            <SubmissionCard
              key={submission.submission_id}
              submission={submission}
              user={user}
              index={index}
              onDelete={handleDeleteSubmission}
              isDeleting={isDeleting}
              isOrgAdmin={isOrgAdmin()}
              onViewSubmission={handleViewSubmission}
              getCategoryCounts={getCategoryCounts}
            />
          ))}

          {submissions.length === 0 && !isLoading && <EmptyState />}
        </div>
      </div>
    </div>
  );
};
