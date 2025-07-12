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
import { renderAnswer } from "@/utils/renderAnswer";

export const SubmissionView: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const {
    data: submissionData,
    isLoading: submissionLoading,
    isError: submissionError,
  } = useSubmissionsServiceGetSubmissionsBySubmissionId({
    submissionId: submissionId || "",
  });
  const submission = submissionData?.submission;
  const assessmentId = submission?.assessment_id;

  const {
    data: assessmentDetail,
    isLoading: assessmentLoading,
    isError: assessmentError,
  } = useAssessmentsServiceGetAssessmentsByAssessmentId(
    assessmentId ? { assessmentId } : { assessmentId: "" },
    undefined,
    { enabled: !!assessmentId },
  );

  const {
    data: questionsData,
    isLoading: questionsLoading,
    isError: questionsError,
  } = useQuestionsServiceGetQuestions();

  const groupedQuestions = useMemo(() => {
    if (!assessmentDetail?.questions || !questionsData?.questions) return {};
    const questionIdToCategory: Record<string, string> = {};
    questionsData.questions.forEach(
      (qwr: { question: Question; revisions: QuestionRevision[] }) => {
        questionIdToCategory[qwr.question.question_id] = qwr.question.category;
      },
    );
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
              <div className="mb-4 flex justify-between">
                <span className="font-semibold">Status:</span>
                <span>{submission.review_status}</span>
              </div>
              <div className="mb-4 flex justify-between">
                <span className="font-semibold">Submitted At:</span>
                <span>
                  {new Date(submission.submitted_at).toLocaleString()}
                </span>
              </div>
              {submission.reviewed_at && (
                <div className="mb-4 flex justify-between">
                  <span className="font-semibold">Reviewed At:</span>
                  <span>
                    {new Date(submission.reviewed_at).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

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
                        <div className="space-y-2">{renderAnswer(answer)}</div>
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
