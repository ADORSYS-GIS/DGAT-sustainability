/*
 * Custom hook for managing submission view data and state
 * Fetches submission data, groups responses by category, and provides loading states
 * Handles URL parameter extraction and data transformation for display
 */

import React from "react";
import { useParams } from "react-router-dom";
import { useOfflineSubmissions } from "@/hooks/useOfflineApi";
import type { Submission_content_responses } from "@/openapi-rq/requests/types.gen";

// Locally extend the type to include question_category
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
}

export const useSubmissionView = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const {
    data: submissionsData,
    isLoading: submissionLoading,
    error: submissionError,
  } = useOfflineSubmissions();
  
  // Find the specific submission by ID
  const submission = submissionsData?.submissions?.find(s => s.submission_id === submissionId);
  const responses = submission?.content?.responses as SubmissionResponseWithCategory[] | undefined;

  // Group responses by category
  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, SubmissionResponseWithCategory[]> = {};
    if (responses) {
      for (const resp of responses) {
        const cat = resp.question_category || "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(resp);
      }
    }
    return groups;
  }, [responses]);
  
  const categories = Object.keys(groupedByCategory);

  return {
    // State
    submissionLoading,
    submissionError,

    // Data
    submission,
    responses,
    groupedByCategory,
    categories,
  };
}; 