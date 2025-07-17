import { Navbar } from "@/components/shared/Navbar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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

  // Helper to parse the response JSON and extract fields
  const parseAnswer = (response: string | undefined): { yesNo?: boolean; percentage?: number; text?: string; files?: { name?: string; url?: string }[] } => {
    if (!response) return {};
    try {
      // Try to parse as array of stringified JSON
      const arr = JSON.parse(response);
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
        const obj = JSON.parse(arr[0]);
        return {
          yesNo: typeof obj.yesNo === 'boolean' ? obj.yesNo : undefined,
          percentage: typeof obj.percentage === 'number' ? obj.percentage : undefined,
          text: typeof obj.text === 'string' ? obj.text : undefined,
          files: Array.isArray(obj.files) && obj.files.every(f => typeof f === 'object' && f !== null && 'url' in f) ? obj.files as { name?: string; url?: string }[] : [],
        };
      } else if (typeof arr === 'object' && arr !== null) {
        const filesRaw = (arr as { files?: unknown }).files;
        const files: { name?: string; url?: string }[] = Array.isArray(filesRaw) && filesRaw.every(f => typeof f === 'object' && f !== null && 'url' in f)
          ? filesRaw as { name?: string; url?: string }[]
          : [];
        return {
          yesNo: typeof arr.yesNo === 'boolean' ? arr.yesNo : undefined,
          percentage: typeof arr.percentage === 'number' ? arr.percentage : undefined,
          text: typeof arr.text === 'string' ? arr.text : undefined,
          files,
        };
      }
    } catch { /* ignore parse errors */ }
    return { text: response };
  };

  // Fetch submissions for review (status: under_review)
  const {
    data: submissionsData,
    isLoading: isLoadingSubmissions,
    isError: isSubmissionsError,
    error: submissionsError,
    isSuccess: isSubmissionsSuccess,
    refetch: refetchSubmissions,
  } = useAdminServiceGetAdminSubmissions({ status: "under_review" });
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
    // recommendations keys are in the format `${category}-${idx}`
    const recommendationsArray = Object.entries(recommendations).map(([key, value]) => {
      // Extract category from key
      const [category] = key.split('-');
      return {
        category,
        recommendation: value,
      };
    });
    generateReportMutation.mutate({
      submissionId: selectedSubmission.submission_id,
      // Remove type assertion so payload is sent as plain array
      requestBody: recommendationsArray,
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
                    <h3 className="font-medium mb-2">Assessment Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        Organization: unknown
                      </div>
                      <div>User: {selectedSubmission.user_id}</div>
                      <div>
                        Created: {new Date(selectedSubmission.submitted_at).toLocaleDateString()}
                      </div>
                      <div>Score: Not calculated%</div>
                    </div>
                  </div>

                  {/* Categories and Questions */}
                  <Accordion type="single" collapsible className="w-full">
                    {(() => {
                      type AdminResponse = {
                        question_text?: string;
                        question_category?: string;
                        response?: string[] | string;
                        files?: unknown[];
                      };
                      const grouped: Record<string, AdminResponse[]> = {};
                      (selectedSubmission.content.responses || []).forEach((resp) => {
                        const r = resp as AdminResponse;
                        const cat = r.question_category || 'General';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(r);
                      });
                      return Object.entries(grouped).map(([category, resps]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="font-semibold text-lg">{category}</AccordionTrigger>
                          <AccordionContent>
                            {resps.map((resp, idx) => {
                              const answer = Array.isArray(resp.response) ? resp.response[0] : resp.response;
                              const parsed = parseAnswer(answer);
                              return (
                                <div key={idx} className="border-l-4 border-dgrv-blue pl-4 mb-8 py-4 bg-white/80 rounded-md">
                                   {/* Question Header */}
                                   <div className="mb-3">
                                     <span className="block text-lg font-bold text-dgrv-blue tracking-tight">Question:</span>
                                     <span className="block text-base font-semibold text-gray-900 mt-1">{resp.question_text}</span>
                                   </div>
                                   {/* User Response Section - each field on its own line */}
                                   <div className="flex flex-col gap-2 mb-2">
                                     <span className="font-semibold text-gray-700 mb-1">User Response</span>
                                     <div className="flex flex-col gap-2 mt-1">
                                       {typeof parsed.yesNo === 'boolean' && (
                                         <div className="flex items-center gap-2">
                                           <span className="font-medium">Yes/No:</span>
                                           <span className={parsed.yesNo ? 'text-dgrv-green font-bold' : 'text-red-500 font-bold'}>{parsed.yesNo ? 'Yes' : 'No'}</span>
                                         </div>
                                       )}
                                       {typeof parsed.percentage === 'number' && (
                                         <div className="flex items-center gap-2">
                                           <span className="font-medium">Percentage:</span>
                                           <span className="text-dgrv-blue font-bold">{parsed.percentage}%</span>
                                         </div>
                                       )}
                                       {parsed.text && (
                                         <div className="flex items-center gap-2">
                                           <span className="font-medium">Text:</span>
                                           <span className="font-bold" style={{ color: '#1e3a8a' }}>{parsed.text}</span>
                                         </div>
                                       )}
                                       {parsed.files && parsed.files.length > 0 && (
                                         <div className="flex items-center gap-2">
                                           <span className="font-medium">Files:</span>
                                           <div className="flex flex-wrap gap-2 mt-1">
                                             {parsed.files.map((file, fidx) => (
                                               <a
                                                 key={fidx}
                                                 href={file.url}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="text-xs text-blue-600 underline"
                                                 download={file.name}
                                               >
                                                 {file.name || `File ${fidx + 1}`}
                                               </a>
                                             ))}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <label className="block text-xs font-medium mb-1" htmlFor={`rec-${category}-${idx}`}>Add Recommendation:</label>
                                    <textarea
                                      id={`rec-${category}-${idx}`}
                                      className="w-full border rounded p-2 text-sm"
                                      rows={2}
                                      value={recommendations[`${category}-${idx}`] || ""}
                                      onChange={e => setRecommendations(prev => ({ ...prev, [`${category}-${idx}`]: e.target.value }))}
                                      placeholder="Enter your recommendation for this question..."
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      ));
                    })()}
                  </Accordion>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      onClick={handleSubmitReport}
                      disabled={generateReportMutation.isPending}
                      className="bg-dgrv-green hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {generateReportMutation.isPending ? "Submitting..." : "Submit Report"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
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
