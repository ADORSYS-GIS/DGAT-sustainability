import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Assessment } from "@/services/user/assessmentService";
import { Question } from "@/services/admin/questionService";
import { Category } from "@/services/admin/categoryService";
import { getRecommendationsByAssessment } from "@/services/user/assessmentService";
import { getQuestionsByTemplate } from "@/services/admin/questionService";
import { getCategoriesByTemplate } from "@/services/admin/categoryService";
import {
  getAssessmentsForReview,
  updateAssessmentStatus,
  addRecommendation,
  Recommendation,
} from "@/services/admin/reviewService";
import { FileText, Eye, MessageSquare, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/shared/use-toast";

type Answer = {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
};

export const ReviewAssessments: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [recommendationText, setRecommendationText] = useState<
    Record<string, string>
  >({});

  const {
    data: assessments = [],
    isLoading: isLoadingAssessments,
    isError: isAssessmentsError,
  } = useQuery<Assessment[]>({
    queryKey: ["assessments", "review"],
    queryFn: getAssessmentsForReview,
  });

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["questions", selectedAssessment?.templateId],
    queryFn: () => getQuestionsByTemplate(selectedAssessment!.templateId),
    enabled: !!selectedAssessment,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", selectedAssessment?.templateId],
    queryFn: () => getCategoriesByTemplate(selectedAssessment!.templateId),
    enabled: !!selectedAssessment,
  });

  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: ["recommendations", selectedAssessment?.assessmentId],
    queryFn: () =>
      getRecommendationsByAssessment(selectedAssessment!.assessmentId),
    enabled: !!selectedAssessment,
  });

  const addRecommendationMutation = useMutation({
    mutationFn: addRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recommendations", selectedAssessment?.assessmentId],
      });
      toast({
        title: "Success",
        description: "Recommendation added successfully",
        className: "bg-dgrv-green text-white",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add recommendation",
        variant: "destructive",
      });
    },
  });

  const completeReviewMutation = useMutation({
    mutationFn: (assessmentId: string) =>
      updateAssessmentStatus(assessmentId, "completed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", "review"] });
      setShowReviewDialog(false);
      setSelectedAssessment(null);
      toast({
        title: "Success",
        description: "Assessment review completed successfully",
        className: "bg-dgrv-green text-white",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete review",
        variant: "destructive",
      });
    },
  });

  const handleOpenReviewDialog = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowReviewDialog(true);
  };

  const handleAddRecommendation = (categoryId: string) => {
    const text = recommendationText[categoryId];
    if (!text || !text.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recommendation",
        variant: "destructive",
      });
      return;
    }

    addRecommendationMutation.mutate({
      assessmentId: selectedAssessment!.assessmentId,
      categoryId,
      text: { en: text },
      createdBy: "admin", // In real app, use actual admin user ID
    });
    setRecommendationText((prev) => ({ ...prev, [categoryId]: "" }));
  };

  const handleCompleteReview = () => {
    if (!selectedAssessment) return;
    completeReviewMutation.mutate(selectedAssessment.assessmentId);
  };

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

  const getQuestionsByCategory = (categoryId: string) => {
    return questions.filter((q) => q.categoryId === categoryId);
  };

  const getCategoryRecommendations = (categoryId: string) => {
    return recommendations.filter(
      (r) => r.categoryId === categoryId && !r.questionId,
    );
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
                      <p>Organization ID: {assessment.organizationId}</p>
                      <p>User ID: {assessment.userId}</p>
                      {assessment.score && (
                        <p className="font-medium">
                          Score: {assessment.score}%
                        </p>
                      )}
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
                        Organization: {selectedAssessment.organizationId}
                      </div>
                      <div>User: {selectedAssessment.userId}</div>
                      <div>
                        Created:{" "}
                        {new Date(
                          selectedAssessment.createdAt,
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        Score: {selectedAssessment.score || "Not calculated"}%
                      </div>
                    </div>
                  </div>

                  {/* Categories and Questions */}
                  <Accordion type="single" collapsible className="w-full">
                    {categories.map((category) => {
                      const categoryQuestions = getQuestionsByCategory(
                        category.categoryId,
                      );
                      const categoryRecs = getCategoryRecommendations(
                        category.categoryId,
                      );

                      return (
                        <AccordionItem
                          key={category.categoryId}
                          value={category.categoryId}
                        >
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span>{category.name}</span>
                              <div className="flex items-center space-x-2">
                                {selectedAssessment.categoryScores?.[
                                  category.categoryId
                                ] && (
                                  <Badge variant="outline">
                                    {
                                      selectedAssessment.categoryScores[
                                        category.categoryId
                                      ]
                                    }
                                    %
                                  </Badge>
                                )}
                                {recommendations.filter(
                                  (r) => r.categoryId === category.categoryId,
                                ).length > 0 && (
                                  <Badge className="bg-dgrv-green text-white">
                                    {
                                      recommendations.filter(
                                        (r) =>
                                          r.categoryId === category.categoryId,
                                      ).length
                                    }{" "}
                                    recommendations
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {/* Questions and Answers */}
                              {categoryQuestions.map((question) => {
                                const answer = selectedAssessment.answers[
                                  question.questionId
                                ] as Answer;
                                const comments = (
                                  selectedAssessment.answers as {
                                    comments?: Record<string, string>;
                                  }
                                ).comments?.[question.questionId];

                                return (
                                  <div
                                    key={question.questionId}
                                    className="border-l-4 border-dgrv-blue pl-4"
                                  >
                                    <h4 className="font-medium text-sm">
                                      {question.text.en}
                                    </h4>
                                    <div className="mt-2 text-sm space-y-1">
                                      {answer && typeof answer === "object" ? (
                                        <div>
                                          {answer.yesNo !== undefined && (
                                            <div>
                                              <span className="font-medium">
                                                Yes/No:{" "}
                                              </span>
                                              <span className="text-dgrv-blue">
                                                {answer.yesNo ? "Yes" : "No"}
                                              </span>
                                            </div>
                                          )}
                                          {answer.percentage !== undefined && (
                                            <div>
                                              <span className="font-medium">
                                                Percentage:{" "}
                                              </span>
                                              <span className="text-dgrv-blue">
                                                {answer.percentage}%
                                              </span>
                                            </div>
                                          )}
                                          {answer.text && (
                                            <div>
                                              <span className="font-medium">
                                                Text:{" "}
                                              </span>
                                              <span className="text-dgrv-blue">
                                                {answer.text}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="font-medium">
                                            Answer:{" "}
                                          </span>
                                          <span className="text-dgrv-blue">
                                            {typeof answer === "boolean"
                                              ? answer
                                                ? "Yes"
                                                : "No"
                                              : String(answer)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {comments && (
                                      <div className="mt-1 text-sm">
                                        <span className="font-medium">
                                          Comments:{" "}
                                        </span>
                                        <span className="text-gray-600">
                                          {comments}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Existing Recommendations */}
                              {getCategoryRecommendations(category.categoryId)
                                .length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-sm mb-2">
                                    Existing Recommendations:
                                  </h4>
                                  {getCategoryRecommendations(
                                    category.categoryId,
                                  ).map((rec) => (
                                    <div
                                      key={rec.recommendationId}
                                      className="bg-green-50 p-3 rounded border-l-4 border-dgrv-green"
                                    >
                                      <p className="text-sm">{rec.text.en}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add New Recommendation */}
                              <div className="mt-4 space-y-2">
                                <h4 className="font-medium text-sm">
                                  Add Recommendation:
                                </h4>
                                <Textarea
                                  value={
                                    recommendationText[category.categoryId] ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setRecommendationText((prev) => ({
                                      ...prev,
                                      [category.categoryId]: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your recommendation for this category..."
                                  rows={3}
                                />
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleAddRecommendation(category.categoryId)
                                  }
                                  disabled={addRecommendationMutation.isPending}
                                  className="bg-dgrv-green hover:bg-green-700"
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  {addRecommendationMutation.isPending
                                    ? "Adding..."
                                    : "Add Recommendation"}
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      onClick={handleCompleteReview}
                      disabled={completeReviewMutation.isPending}
                      className="bg-dgrv-green hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completeReviewMutation.isPending
                        ? "Completing..."
                        : "Complete Review"}
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
