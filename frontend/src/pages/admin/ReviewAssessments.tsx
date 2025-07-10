import { Navbar } from "@/components/shared/Navbar";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Eye, FileText } from "lucide-react";
import React, { useState, useCallback } from "react";
import {
  useAdminServiceGetAdminSubmissions,
  useReportsServicePostSubmissionsBySubmissionIdReports,
  useResponsesServiceGetAssessmentsByAssessmentIdResponses,
} from "../../openapi-rq/queries/queries";
import type {
  AdminSubmissionDetail,
  GenerateReportRequest,
  Response,
} from "../../openapi-rq/requests/types.gen";

interface Recommendation {
  recommendationId: string;
  assessmentId: string;
  categoryId: string;
  text: { en: string };
  createdBy: string;
}

type Answer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
};

export const ReviewAssessments: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] =
    useState<AdminSubmissionDetail | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [recommendations, setRecommendations] = useState<
    Record<string, string>
  >({});

  // Fetch submissions for review (status: pending_review)
  const {
    data: submissionsData,
    isLoading: isLoadingSubmissions,
    isError: isSubmissionsError,
    error: submissionsError,
    isSuccess: isSubmissionsSuccess,
    refetch: refetchSubmissions,
  } = useAdminServiceGetAdminSubmissions({ status: "pending_review" });
  const submissions: AdminSubmissionDetail[] =
    submissionsData?.submissions || [];

  React.useEffect(() => {
    if (isSubmissionsError) {
      toast.error("Error loading submissions", {
        description:
          submissionsError instanceof Error
            ? submissionsError.message
            : String(submissionsError),
      });
    }
  }, [isSubmissionsError, submissionsError]);

  // Fetch responses for the selected assessment
  const {
    data: responsesData,
    isLoading: responsesLoading,
    isError: isResponsesError,
    error: responsesError,
    isSuccess: isResponsesSuccess,
  } = useResponsesServiceGetAssessmentsByAssessmentIdResponses(
    selectedSubmission
      ? { assessmentId: selectedSubmission.assessment_id }
      : { assessmentId: "" },
    undefined,
    { enabled: !!selectedSubmission },
  );
  const responses: Response[] = responsesData?.responses || [];

  React.useEffect(() => {
    if (isResponsesError) {
      toast.error("Error loading responses", {
        description:
          responsesError instanceof Error
            ? responsesError.message
            : String(responsesError),
      });
    }
  }, [isResponsesError, responsesError]);

  // Mutation for generating a report
  const generateReportMutation =
    useReportsServicePostSubmissionsBySubmissionIdReports({
      onSuccess: () => {
        toast.success("Report submitted successfully.");
        setRecommendations({});
        setShowReviewDialog(false);
        setSelectedSubmission(null);
      },
      onError: (error: unknown) =>
        toast.error("Error submitting report", {
          description: getErrorMessage(error),
        }),
    });

  // Helper to extract error message
  function getErrorMessage(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    return "Unknown error";
  }

  const handleOpenReviewDialog = useCallback(
    (submission: AdminSubmissionDetail) => {
      setSelectedSubmission(submission);
      setShowReviewDialog(true);
    },
    [],
  );

  const handleSubmitReport = useCallback(() => {
    if (!selectedSubmission) return;
    const reportPayload: GenerateReportRequest = {
      report_type: "sustainability",
      options: {
        recommendations: Object.entries(recommendations).map(
          ([response_id, text]) => ({
            response_id,
            text,
          }),
        ),
      },
    };
    generateReportMutation.mutate({
      submissionId: selectedSubmission.submission_id,
      requestBody: reportPayload,
    });
  }, [selectedSubmission, recommendations, generateReportMutation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_review":
        return "bg-blue-500 text-white";
      case "under_review":
        return "bg-orange-500 text-white";
      case "approved":
        return "bg-dgrv-green text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "revision_requested":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "pending_review":
        return "Pending Review";
      case "under_review":
        return "Under Review";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "revision_requested":
        return "Revision Requested";
      default:
        return "Unknown";
    }
  };

  if (isLoadingSubmissions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  if (isSubmissionsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <p className="text-red-500">Error loading submissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-8 h-8 text-dgrv-blue" />
              <h1 className="text-3xl font-bold text-dgrv-blue">
                Review Assessments
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Review submitted assessments and provide recommendations
            </p>
          </div>

          {/* Submissions Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((submission, index) => (
              <Card
                key={submission.submission_id}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-dgrv-blue/10">
                        <FileText className="w-5 h-5 text-dgrv-blue" />
                      </div>
                      <div>
                        <span className="text-lg">Submission</span>
                        <p className="text-sm font-normal text-gray-600">
                          {new Date(
                            submission.submitted_at,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(submission.review_status)}>
                      {formatStatus(submission.review_status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p>Submission ID: {submission.submission_id}</p>
                      <p>User ID: {submission.user_id}</p>
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        size="sm"
                        onClick={() => handleOpenReviewDialog(submission)}
                        className="flex-1 bg-dgrv-blue hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {submissions.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No submissions to review
                  </h3>
                  <p className="text-gray-600">
                    All submissions are up to date!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Review Dialog */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Submission</DialogTitle>
              </DialogHeader>

              {selectedSubmission && (
                <div className="space-y-6">
                  {/* Submission Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Submission Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        Submission ID: {selectedSubmission.submission_id}
                      </div>
                      <div>User: {selectedSubmission.user_id}</div>
                      <div>
                        Submitted:{" "}
                        {new Date(
                          selectedSubmission.submitted_at,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Categories and Questions */}
                  <Accordion type="single" collapsible className="w-full">
                    {responses.map((resp) => {
                      const questionText =
                        typeof resp === "object" &&
                        resp !== null &&
                        "question" in resp &&
                        typeof resp.question === "string"
                          ? resp.question
                          : "Question text unavailable";
                      return (
                        <div
                          key={resp.response_id}
                          className="border-l-4 border-dgrv-blue pl-4 mb-4"
                        >
                          <h4 className="font-medium text-sm">
                            {questionText}
                          </h4>
                          <div className="mt-2 text-sm space-y-1">
                            <span className="font-medium">Answer: </span>
                            <span className="text-dgrv-blue">
                              {resp.response}
                            </span>
                          </div>
                          <div className="mt-2">
                            <label
                              className="block text-xs font-medium mb-1"
                              htmlFor={`rec-${resp.response_id}`}
                            >
                              Recommendation
                            </label>
                            <textarea
                              id={`rec-${resp.response_id}`}
                              className="w-full border rounded p-2 text-sm"
                              rows={2}
                              value={recommendations[resp.response_id] || ""}
                              onChange={(e) =>
                                setRecommendations((prev) => ({
                                  ...prev,
                                  [resp.response_id]: e.target.value,
                                }))
                              }
                              placeholder="Enter recommendation for this question"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </Accordion>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      onClick={handleSubmitReport}
                      disabled={generateReportMutation.isPending}
                      className="bg-dgrv-green hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {generateReportMutation.isPending
                        ? "Submitting..."
                        : "Submit Report"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewDialog(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
