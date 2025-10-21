/**
 * @file services.ts
 * @description This file contains services and utility functions for the Assessment page.
 */
import {
  Assessment as AssessmentType,
  AssessmentDetailResponse,
  CreateResponseRequest,
  QuestionRevision,
} from "@/openapi-rq/requests/types.gen";

export type FileData = { name: string; url: string };

export type LocalAnswer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
  files?: FileData[];
};

// Type guard for AssessmentDetailResponse
export function isAssessmentDetailResponse(
  data: AssessmentType | AssessmentDetailResponse | undefined
): data is AssessmentDetailResponse {
  return !!data && "assessment" in data && !!data.assessment;
}

// Type guard for QuestionRevision
function hasQuestionRevisionId(
  revision: QuestionRevision
): revision is QuestionRevision & { question_revision_id: string } {
  return (
    "question_revision_id" in revision &&
    typeof revision.question_revision_id === "string"
  );
}

export const getRevisionKey = (revision: QuestionRevision): string => {
  return hasQuestionRevisionId(revision) ? revision.question_revision_id : "";
};

export const createResponseToSave = (
  key: string,
  answer: LocalAnswer
): CreateResponseRequest => ({
  question_revision_id: key,
  response: JSON.stringify(answer),
  version: 1,
});

export const isAnswerComplete = (answer: LocalAnswer) =>
  typeof answer?.yesNo === "boolean" &&
  typeof answer?.percentage === "number" &&
  typeof answer?.text === "string" &&
  answer.text.trim() !== "";