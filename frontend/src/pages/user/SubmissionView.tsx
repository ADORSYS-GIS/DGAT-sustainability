import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useSubmissionsServiceGetSubmissionsBySubmissionId,
  useAssessmentsServiceGetAssessmentsByAssessmentId,
  useQuestionsServiceGetQuestions,
} from "../../openapi-rq/queries/queries";
import type {
  Question,
  QuestionRevision,
  Response,
} from "../../openapi-rq/requests/types.gen";

export const SubmissionView: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  // Fetch submission to get assessment_id
  const {
    data: submissionData,
    isLoading: submissionLoading,
    isError: submissionError,
  } = useSubmissionsServiceGetSubmissionsBySubmissionId({
    submissionId: submissionId || "",
  });
  const submission = submissionData?.submission;
  const assessmentId = submission?.assessment_id;

  // Fetch assessment detail (questions + responses)
  const {
    data: assessmentDetail,
    isLoading: assessmentLoading,
    isError: assessmentError,
  } = useAssessmentsServiceGetAssessmentsByAssessmentId(
    assessmentId ? { assessmentId } : { assessmentId: "" },
    undefined,
    { enabled: !!assessmentId },
  );

  //  Fetch all questions (to get categories)
  const {
    data: questionsData,
    isLoading: questionsLoading,
    isError: questionsError,
  } = useQuestionsServiceGetQuestions();

  // Group questions by category (using base question)
  const groupedQuestions = useMemo(() => {
    if (!assessmentDetail?.questions || !questionsData?.questions) return {};
    // Build a map of question_id -> category
    const questionIdToCategory: Record<string, string> = {};
    questionsData.questions.forEach(
      (qwr: { question: Question; revisions: QuestionRevision[] }) => {
        questionIdToCategory[qwr.question.question_id] = qwr.question.category;
      },
    );
    // Group by category
    const groups: Record<
      string,
      { revision: QuestionRevision; response?: Response }[]
    > = {};
    assessmentDetail.questions.forEach((revision: QuestionRevision) => {
      const category =
        questionIdToCategory[revision.question_id] || "Uncategorized";
      const response = assessmentDetail.responses.find(
        (r) => r.question_revision_id === revision.question_revision_id,
      );
      if (!groups[category]) groups[category] = [];
      groups[category].push({ revision, response });
    });
    return groups;
  }, [assessmentDetail, questionsData]);

  const categories = Object.keys(groupedQuestions);

  if (submissionLoading || assessmentLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }
  if (
    submissionError ||
    assessmentError ||
    questionsError ||
    !submission ||
    !assessmentDetail
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="text-red-600">Error loading submission details.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <strong>Submission ID:</strong> {submission.submission_id}
              </div>
              <div className="mb-4">
                <strong>Assessment ID:</strong> {submission.assessment_id}
              </div>
              <div className="mb-4">
                <strong>User ID:</strong> {submission.user_id}
              </div>
              <div className="mb-4">
                <strong>Status:</strong> {submission.review_status}
              </div>
              <div className="mb-4">
                <strong>Submitted At:</strong>{" "}
                {new Date(submission.submitted_at).toLocaleString()}
              </div>
              {submission.reviewed_at && (
                <div className="mb-4">
                  <strong>Reviewed At:</strong>{" "}
                  {new Date(submission.reviewed_at).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Render grouped questions and answers */}
          {categories.map((category) => (
            <Card key={category} className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl text-dgrv-blue">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {groupedQuestions[category].map(
                  ({ revision, response }, idx) => {
                    let answer: Record<string, unknown> | string | undefined =
                      undefined;
                    try {
                      answer = response?.response
                        ? JSON.parse(response.response)
                        : undefined;
                    } catch {
                      answer = response?.response;
                    }
                    return (
                      <div
                        key={revision.question_revision_id}
                        className="border-b pb-6 last:border-b-0"
                      >
                        <div className="mb-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {idx + 1}. {revision.text}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {answer &&
                          typeof answer === "object" &&
                          !Array.isArray(answer) ? (
                            <>
                              {"yesNo" in answer && (
                                <div>
                                  <strong>Yes/No:</strong>{" "}
                                  {(answer as Record<string, unknown>).yesNo ===
                                  true
                                    ? "Yes"
                                    : (answer as Record<string, unknown>)
                                          .yesNo === false
                                      ? "No"
                                      : ""}
                                </div>
                              )}
                              {"percentage" in answer && (
                                <div>
                                  <strong>Percentage:</strong>{" "}
                                  {
                                    (answer as Record<string, unknown>)
                                      .percentage as number
                                  }
                                  %
                                </div>
                              )}
                              {"text" in answer &&
                                (answer as Record<string, unknown>).text && (
                                  <div>
                                    <strong>Text:</strong>{" "}
                                    {
                                      (answer as Record<string, unknown>)
                                        .text as string
                                    }
                                  </div>
                                )}
                              {"files" in answer &&
                                Array.isArray(
                                  (answer as Record<string, unknown>).files,
                                ) &&
                                (
                                  (answer as Record<string, unknown>)
                                    .files as Array<{
                                    name?: string;
                                    url?: string;
                                  }>
                                ).length > 0 && (
                                  <div>
                                    <strong>Files:</strong>
                                    <ul className="list-disc ml-6">
                                      {(
                                        (answer as Record<string, unknown>)
                                          .files as Array<{
                                          name?: string;
                                          url?: string;
                                        }>
                                      ).map((file, i) => (
                                        <li key={i}>
                                          {file.url ? (
                                            <a
                                              href={file.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 underline"
                                            >
                                              {file.name || `File ${i + 1}`}
                                            </a>
                                          ) : (
                                            file.name || `File ${i + 1}`
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </>
                          ) : (
                            <div>
                              <strong>Answer:</strong>{" "}
                              {answer !== undefined ? (
                                String(answer)
                              ) : (
                                <span className="text-gray-400">No answer</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
