import * as React from "react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  useSubmissionsServiceGetSubmissionsBySubmissionId,
  useAssessmentsServiceGetAssessmentsByAssessmentId,
  useQuestionsServiceGetQuestions,
} from "../../openapi-rq/queries/queries";
import type {
  Question,
  QuestionRevision,
  Response as SubmissionResponse,
} from "../../openapi-rq/requests/types.gen";
import { useAuth } from "@/hooks/shared/useAuth";

export const SubmissionView: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user } = useAuth();
  // Helper to get org_id from token
  const orgId = React.useMemo(() => {
    if (!user || !user.organizations) return "";
    const orgKeys = Object.keys(user.organizations);
    if (orgKeys.length === 0) return "";
    const orgObj = user.organizations[orgKeys[0]] || {};
    return orgObj.id || "";
  }, [user]);
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

  // Group questions by category (support both old and new formats, like Assessment.tsx)
  const groupedQuestions = useMemo(() => {
    if (!questionsData?.questions) return {};
    const groups: Record<
      string,
      { question: Question; revision: QuestionRevision }[]
    > = {};
    type QuestionNewFormat = {
      question_id: string;
      category: string;
      created_at: string;
      latest_revision: QuestionRevision;
    };
    type QuestionOldFormat = {
      question: Question;
      revisions: QuestionRevision[];
    };
    type QuestionUnion = QuestionNewFormat | QuestionOldFormat;
    (questionsData.questions as QuestionUnion[]).forEach((q) => {
      let category: string | undefined;
      let question: Question | undefined;
      let revision: QuestionRevision | undefined;
      if ("category" in q && "latest_revision" in q) {
        // New format
        category = q.category;
        question = {
          question_id: q.question_id,
          category: q.category,
          created_at: q.created_at,
        };
        revision = q.latest_revision;
      } else if ("question" in q && "revisions" in q) {
        // Old format
        category = q.question.category;
        question = q.question;
        revision = q.revisions[q.revisions.length - 1];
      }
      if (category && question && revision) {
        if (!groups[category]) groups[category] = [];
        groups[category].push({ question, revision });
      }
    });
    return groups;
  }, [questionsData]);

  const categories = Object.keys(groupedQuestions);

  // Helper to find response for a question
  const findResponseForQuestion = (
    question_revision_id: string,
    revision: QuestionRevision,
  ) => {
    const responses = submission?.content?.responses as
      | SubmissionResponse[]
      | undefined;
    if (!responses) return undefined;
    // Try to match by question_revision_id first
    let found = responses.find(
      (r) => r.question_revision_id === question_revision_id,
    );
    if (found) return found;
    // Fallback: match by question text (en)
    let questionText = "";
    if (typeof revision.text === "object" && revision.text !== null) {
      const textObj = revision.text as Record<string, unknown>;
      if (typeof textObj["en"] === "string") {
        questionText = textObj["en"] as string;
      } else {
        const firstString = Object.values(textObj).find(
          (v) => typeof v === "string",
        );
        questionText = typeof firstString === "string" ? firstString : "";
      }
    } else if (typeof revision.text === "string") {
      questionText = revision.text;
    }
    // Type guard for question property
    function hasQuestionEn(obj: unknown): obj is { question: { en: string } } {
      return (
        typeof obj === "object" &&
        obj !== null &&
        "question" in obj &&
        typeof (obj as { question?: unknown }).question === "object" &&
        (obj as { question?: unknown }).question !== null &&
        "en" in (obj as { question: { en?: unknown } }).question &&
        typeof (
          (obj as { question: { en?: unknown } }).question as { en?: unknown }
        ).en === "string"
      );
    }
    // Try to match by question.en in response
    found = responses.find((r) => {
      if (hasQuestionEn(r)) {
        return r.question.en === questionText;
      }
      return false;
    });
    return found;
  };

  // Helper to get the question revision id key
  function hasQuestionRevisionId(
    obj: QuestionRevision,
  ): obj is QuestionRevision & { question_revision_id: string } {
    return (
      "question_revision_id" in obj &&
      typeof (obj as { question_revision_id?: unknown })
        .question_revision_id === "string"
    );
  }
  const getRevisionKey = (revision: QuestionRevision): string => {
    if (hasQuestionRevisionId(revision)) {
      return revision.question_revision_id;
    } else if (
      "latest_revision" in revision &&
      typeof (revision as { latest_revision?: unknown }).latest_revision ===
        "string"
    ) {
      return (revision as { latest_revision: string }).latest_revision;
    }
    return "";
  };

  // Helper to extract question text (copied from Assessment.tsx)
  const getQuestionText = (revision: QuestionRevision): string => {
    if (typeof revision.text === "object" && revision.text !== null) {
      const textObj = revision.text as Record<string, unknown>;
      if (typeof textObj["en"] === "string") {
        return textObj["en"] as string;
      }
      const firstString = Object.values(textObj).find(
        (v) => typeof v === "string",
      );
      return typeof firstString === "string" ? firstString : "";
    } else if (typeof revision.text === "string") {
      return revision.text;
    }
    return "";
  };

  // Render a read-only answer block matching Assessment.tsx UI
  const renderReadOnlyAnswer = (
    revision: QuestionRevision,
    response: SubmissionResponse | undefined,
  ) => {
    // Parse the answer
    let answer: Record<string, unknown> | string | undefined = undefined;
    try {
      if (response?.response) {
        let parsed: unknown = undefined;
        if (Array.isArray(response.response) && response.response.length > 0) {
          // Parse the first element (could extend to all if needed)
          parsed = JSON.parse(response.response[0]);
        } else if (typeof response.response === "string") {
          // Try to parse as array of strings
          let arr: unknown = undefined;
          try {
            arr = JSON.parse(response.response);
          } catch {
            arr = undefined;
          }
          if (
            Array.isArray(arr) &&
            arr.length > 0 &&
            typeof arr[0] === "string"
          ) {
            parsed = JSON.parse(arr[0]);
          } else if (typeof arr === "object" && arr !== null) {
            parsed = arr;
          } else {
            // fallback: try to parse as object
            parsed = JSON.parse(response.response);
          }
        }
        if (
          typeof parsed === "string" ||
          (typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed))
        ) {
          answer = parsed as string | Record<string, unknown>;
        } else {
          answer = undefined;
        }
      }
    } catch {
      // fallback to raw string if parsing fails
      answer = Array.isArray(response?.response)
        ? response?.response[0]
        : response?.response;
    }
    // Extract values
    const yesNoValue =
      typeof answer === "object" && answer !== null && "yesNo" in answer
        ? (answer as { yesNo?: boolean }).yesNo
        : undefined;
    const percentageValue =
      typeof answer === "object" && answer !== null && "percentage" in answer
        ? (answer as { percentage?: number }).percentage
        : undefined;
    const textValue =
      typeof answer === "object" && answer !== null && "text" in answer
        ? (answer as { text?: string }).text
        : "";
    // Files are inside the answer object, not the top-level response
    const files: { name?: string; url?: string }[] =
      typeof answer === "object" &&
      answer !== null &&
      Array.isArray(
        (answer as { files?: { name?: string; url?: string }[] }).files,
      )
        ? (answer as { files: { name?: string; url?: string }[] }).files
        : [];
    return (
      <div className="space-y-6">
        {/* Yes/No */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">Yes/No</span>
          <div className="flex space-x-4 mt-1">
            <Button
              type="button"
              variant={yesNoValue === true ? "default" : "outline"}
              className={
                yesNoValue === true
                  ? "bg-dgrv-green text-white border-dgrv-green"
                  : "bg-white text-dgrv-green border-dgrv-green hover:bg-dgrv-green/10"
              }
              tabIndex={-1}
              style={{ pointerEvents: "none", opacity: 1 }}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={yesNoValue === false ? "default" : "outline"}
              className={
                yesNoValue === false
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white text-red-500 border-red-500 hover:bg-red-500/10"
              }
              tabIndex={-1}
              style={{ pointerEvents: "none", opacity: 1 }}
            >
              No
            </Button>
          </div>
        </div>
        <div className="border-b border-gray-200 my-2" />
        {/* Percentage */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">Percentage</span>
          <div className="flex space-x-2 mt-1">
            {[0, 25, 50, 75, 100].map((val) => (
              <Button
                key={val}
                type="button"
                variant={percentageValue === val ? "default" : "outline"}
                className={
                  percentageValue === val
                    ? "bg-dgrv-blue text-white border-dgrv-blue"
                    : "bg-white text-dgrv-blue border-dgrv-blue hover:bg-dgrv-blue/10"
                }
                tabIndex={-1}
                style={{ pointerEvents: "none", opacity: 1 }}
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>
        <div className="border-b border-gray-200 my-2" />
        {/* Text Input */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">Text Response</span>
          <Textarea
            value={typeof textValue === "string" ? textValue : ""}
            readOnly
            className="mt-1 bg-gray-50 border border-gray-200 focus:ring-0 focus:border-dgrv-blue text-gray-800"
            rows={3}
            placeholder="No answer"
            style={{ opacity: 1 }}
          />
        </div>
        <div className="border-b border-gray-200 my-2" />
        {/* File List */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">Files</span>
          {files.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              {files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                  download={file.name}
                >
                  {file.name || `File ${idx + 1}`}
                </a>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">No files uploaded</span>
          )}
        </div>
      </div>
    );
  };

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
    <div className="min-h-screen bg-gradient-to-b from-white to-dgrv-light-blue">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-md bg-white/90 border-0">
            <CardHeader className="border-b pb-2 mb-2">
              <CardTitle className="text-2xl font-bold text-dgrv-blue tracking-tight text-left">
                Submission Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0">
                <div className="flex-1">
                  <span className="block text-xs text-gray-500 font-medium mb-1">
                    Status
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {submission.review_status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="block text-xs text-gray-500 font-medium mb-1">
                    Submitted At
                  </span>
                  <span className="text-sm text-gray-700">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                </div>
                {submission.reviewed_at && (
                  <div className="flex-1">
                    <span className="block text-xs text-gray-500 font-medium mb-1">
                      Reviewed At
                    </span>
                    <span className="text-sm text-gray-700">
                      {new Date(submission.reviewed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {/* All categories and questions in a single card */}
              <div className="mt-6">
                <Accordion
                  type="multiple"
                  className="w-full divide-y divide-gray-100"
                >
                  {categories.flatMap((category, catIdx) => [
                    <div key={category} className="text-left px-2 py-4">
                      <div className="text-lg font-semibold text-dgrv-blue mb-2">
                        {category}
                      </div>
                    </div>,
                    ...groupedQuestions[category].map(
                      ({ question, revision }, idx) => {
                        const questionText = getQuestionText(revision);
                        const response = findResponseForQuestion(
                          getRevisionKey(revision),
                          revision,
                        );
                        return (
                          <AccordionItem
                            key={getRevisionKey(revision)}
                            value={getRevisionKey(revision)}
                            className="bg-white/80"
                          >
                            <AccordionTrigger className="text-left text-base font-medium text-gray-900 px-6 py-4 hover:bg-dgrv-blue/5 focus:bg-dgrv-blue/10 rounded-md justify-start items-start">
                              <span className="mr-2 text-gray-400">
                                {idx + 1}.
                              </span>{" "}
                              {questionText}
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2">
                              {renderReadOnlyAnswer(revision, response)}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      },
                    ),
                  ])}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
