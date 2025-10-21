/**
 * @file types.ts
 * @description This file defines the shared types for the Draft Submissions page.
 */
import { Submission_content_responses } from "@/openapi-rq/requests/types.gen";

export interface SubmissionResponseWithCategory
  extends Submission_content_responses {
  question_category?: string;
  question_text?: string;
}

export interface DraftSubmission {
  submission_id: string;
  assessment_id: string;
  assessment_name: string;
  org_id?: string;
  org_name?: string;
  content?: {
    assessment?: {
      assessment_id?: string;
      language?: string;
    };
    responses?: SubmissionResponseWithCategory[];
  };
  review_status: string;
  submitted_at: string;
  reviewed_at?: string | null;
}