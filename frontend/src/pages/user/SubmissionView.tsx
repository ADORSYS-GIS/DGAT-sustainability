/*
 * Main submission view page that displays detailed submission information
 * Assembles all submission view components and handles loading/error states
 * Provides complete view of submission with categorized responses
 */

import { LoadingState } from "@/components/shared";
import { Navbar } from "@/components/shared/Navbar";
import {
  CategoryAccordion,
  ErrorState,
  SubmissionHeader,
} from "@/components/user/SubmissionView";
import { useSubmissionView } from "@/hooks/user/useSubmissionView";
import * as React from "react";

export const SubmissionView: React.FC = () => {
  const {
    // State
    submissionLoading,
    submissionError,

    // Data
    submission,
    groupedByCategory,
    categories,
  } = useSubmissionView();

  if (submissionLoading) {
    return <LoadingState message="Loading submission..." showNavbar={true} />;
  }

  if (submissionError || !submission) {
    return <ErrorState />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <SubmissionHeader submission={submission} />

          <CategoryAccordion
            groupedByCategory={groupedByCategory}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
};
