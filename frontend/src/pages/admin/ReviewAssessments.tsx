import { Navbar } from "@/components/shared/Navbar";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Eye, FileText } from "lucide-react";
import React, { useState, useCallback } from "react";
import {
  useAssessmentsServiceGetAssessments,
  useReportsServicePostAssessmentsByAssessmentIdReports,
  useResponsesServiceGetAssessmentsByAssessmentIdResponses
} from "../../../api/generated/queries/queries";
import type {
  Assessment,
  GenerateReportRequest,
  Response
} from "../../../api/generated/requests/types.gen";


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
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});

  // Fetch assessments for review (status: submitted)
  const {
    data: assessmentsData,
    isLoading: isLoadingAssessments,
    isError: isAssessmentsError,
    error: assessmentsError,
    isSuccess: isAssessmentsSuccess,
    refetch: refetchAssessments,
  } = useAssessmentsServiceGetAssessments({ status: "submitted", limit: 100 });
  const assessments: Assessment[] = assessmentsData?.assessments || [];

  React.useEffect(() => {
    if (isAssessmentsError) {
      toast.error("Error loading assessments", {
        description: assessmentsError instanceof Error ? assessmentsError.message : String(assessmentsError),
      });
    }
  }, [isAssessmentsError, assessmentsError]);

  // Fetch responses for the selected assessment
  const {
    data: responsesData,
    isLoading: responsesLoading,
    isError: isResponsesError,
    error: responsesError,
    isSuccess: isResponsesSuccess,
  } = useResponsesServiceGetAssessmentsByAssessmentIdResponses(
    selectedAssessment ? { assessmentId: selectedAssessment.assessmentId } : { assessmentId: "" },
    undefined,
    { enabled: !!selectedAssessment }
  );
  const responses: Response[] = responsesData?.responses || [];

  React.useEffect(() => {
    if (isResponsesError) {
      toast.error("Error loading responses", {
        description: responsesError instanceof Error ? responsesError.message : String(responsesError),
      });
    }
  }, [isResponsesError, responsesError]);

  // Mutation for generating a report
  const generateReportMutation = useReportsServicePostAssessmentsByAssessmentIdReports({
    onSuccess: () => {
      toast.success("Report submitted successfully.");
      setRecommendations({});
      setShowReviewDialog(false);
      setSelectedAssessment(null);
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

  const handleOpenReviewDialog = useCallback((assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowReviewDialog(true);
  }, []);

  const handleSubmitReport = useCallback(() => {
    if (!selectedAssessment) return;
    const reportPayload: GenerateReportRequest = {
      reportType: "PDF",
      options: {
        recommendations: Object.entries(recommendations).map(([responseId, text]) => ({
          responseId,
          text,
        })),
      },
    };
    generateReportMutation.mutate({
      assessmentId: selectedAssessment.assessmentId,
      requestBody: reportPayload,
    });
  }, [selectedAssessment, recommendations, generateReportMutation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-500 text-white";
      case "under_review":
        return "bg-orange-500 text-white";
      case "completed":
        return "bg-dgrv-green text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "under_review":
        return "Under Review";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  if (isLoadingAssessments) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  if (isAssessmentsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <p className="text-red-500">Error loading assessments.</p>
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

          {/* Assessments Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment, index) => (
              <Card
                key={assessment.assessmentId}
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
                        <span className="text-lg">Assessment</span>
                        <p className="text-sm font-normal text-gray-600">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(assessment.status)}>
                      {formatStatus(assessment.status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p>Organization ID: {assessment.assessmentId}</p>
                      <p>User ID: {assessment.userId}</p>
                    </div>
                    <div className="flex space-x-2 pt-4">
                      <Button
                        size="sm"
                        onClick={() => handleOpenReviewDialog(assessment)}
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

            {assessments.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
                <CardContent>
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No assessments to review
                  </h3>
                  <p className="text-gray-600">
                    All assessments are up to date!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Review Dialog */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Assessment</DialogTitle>
              </DialogHeader>

              {selectedAssessment && (
                <div className="space-y-6">
                  {/* Assessment Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Assessment Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        Organization: {selectedAssessment.assessmentId}
                      </div>
                      <div>User: {selectedAssessment.userId}</div>
                      <div>
                        Created: {new Date(selectedAssessment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Categories and Questions */}
                  <Accordion type="single" collapsible className="w-full">
                    {responses.map((resp) => {
                      const questionText = typeof resp === 'object' && resp !== null && 'question' in resp && typeof resp.question === 'string'
                        ? resp.question
                        : 'Question text unavailable';
                      return (
                        <div key={resp.responseId} className="border-l-4 border-dgrv-blue pl-4 mb-4">
                          <h4 className="font-medium text-sm">{questionText}</h4>
                          <div className="mt-2 text-sm space-y-1">
                            <span className="font-medium">Answer: </span>
                            <span className="text-dgrv-blue">{resp.response}</span>
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-medium mb-1" htmlFor={`rec-${resp.responseId}`}>Recommendation</label>
                            <textarea
                              id={`rec-${resp.responseId}`}
                              className="w-full border rounded p-2 text-sm"
                              rows={2}
                              value={recommendations[resp.responseId] || ""}
                              onChange={e => setRecommendations(prev => ({
                                ...prev,
                                [resp.responseId]: e.target.value
                              }))}
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
                      {generateReportMutation.isPending ? "Submitting..." : "Submit Report"}
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
