/**
 * @file ReviewDialog.tsx
 * @description This file defines the ReviewDialog component for reviewing a submission.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Submission_content_responses } from "@/openapi-rq/requests/types.gen";
import { OfflineSubmission } from "@/types/offline";
import {
  Award,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import FileDisplay from "@/components/shared/FileDisplay";

interface FileAttachment {
  name?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}

interface CategorizedResponse
  extends Omit<Submission_content_responses, "question"> {
  question_text: string;
  question?: {
    en?: string;
  };
}

interface CustomSubmissionResponse
  extends Omit<Submission_content_responses, "question"> {
  question_revision_id?: string;
  question_category?: string;
  question?: {
    en?: string;
  };
}

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: OfflineSubmission | null;
  organizationsMap: Map<string, string>;
  questionsMap: Map<string, { text: string; category: string }>;
  categoryRecommendations: CategoryRecommendation[];
  addCategoryRecommendation: (category: string, recommendation: string) => void;
  removeCategoryRecommendation: (id: string) => void;
  handleSubmitReview: (status: "approved" | "rejected") => void;
  isSubmitting: boolean;
}

const getStatusBadge = (
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  switch (status) {
    case "under_review":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          {t("reviewAssessments.underReview", { defaultValue: "Under Review" })}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t("reviewAssessments.approved", { defaultValue: "Approved" })}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          {t("reviewAssessments.rejected", { defaultValue: "Rejected" })}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onOpenChange,
  submission,
  organizationsMap,
  questionsMap,
  categoryRecommendations,
  addCategoryRecommendation,
  removeCategoryRecommendation,
  handleSubmitReview,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const [currentComment, setCurrentComment] = useState("");
  const [isAddingRecommendation, setIsAddingRecommendation] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const submissionResponses = submission?.content?.responses || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("reviewAssessments.reviewAssessment", {
              defaultValue: "Review Assessment",
            })}
          </DialogTitle>
        </DialogHeader>

        {submission && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">
                {t("reviewAssessments.submissionDetails", {
                  defaultValue: "Submission Details",
                })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">
                    {t("reviewAssessments.assessmentName", {
                      defaultValue: "Assessment Name",
                    })}
                    :
                  </span>
                  <p className="text-gray-600">
                    {submission.assessment_name ||
                      t("reviewAssessments.unknown", {
                        defaultValue: "Unknown",
                      })}
                  </p>
                </div>
                <div>
                  <span className="font-medium">
                    {t("reviewAssessments.organization", {
                      defaultValue: "Organization",
                    })}
                    :
                  </span>
                  <p className="text-gray-600">
                    {organizationsMap.get(submission.organization_id) ||
                      t("reviewAssessments.unknown", {
                        defaultValue: "Unknown",
                      })}
                  </p>
                </div>
                <div>
                  <span className="font-medium">
                    {t("reviewAssessments.submissionDate", {
                      defaultValue: "Submission Date",
                    })}
                    :
                  </span>
                  <p className="text-gray-600">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium">
                    {t("reviewAssessments.status", { defaultValue: "Status" })}:
                  </span>
                  <div className="mt-1">
                    {getStatusBadge(submission.review_status, t)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">
                {t("reviewAssessments.assessmentResponses", {
                  defaultValue: "Assessment Responses",
                })}
              </h3>

              {submissionResponses.length === 0 ? (
                <p className="text-gray-500">
                  {t("reviewAssessments.noResponsesFound", {
                    defaultValue: "No responses found",
                  })}
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    submissionResponses.reduce<
                      Record<string, CategorizedResponse[]>
                    >((acc, response) => {
                      const customResponse =
                        response as CustomSubmissionResponse;
                      const questionDetails =
                        customResponse.question_revision_id
                          ? questionsMap.get(
                              customResponse.question_revision_id
                            )
                          : undefined;
                      const category =
                        customResponse.question_category ||
                        questionDetails?.category ||
                        "Unknown Category";
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      const questionText =
                        questionDetails?.text ||
                        customResponse.question?.en ||
                        "Question text not found";

                      const categorizedResponse: CategorizedResponse = {
                        response: customResponse.response,
                        files: customResponse.files,
                        question: customResponse.question,
                        question_text: questionText,
                      };
                      acc[category].push(categorizedResponse);
                      return acc;
                    }, {})
                  ).map(([category, categoryResponses]) => {
                    const recsForCategory = categoryRecommendations.filter(
                      (rec) => rec.category === category
                    );

                    return (
                      <Card
                        key={category}
                        className="border-l-4 border-blue-500"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-full bg-blue-100">
                                <Award className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {category}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                  {categoryResponses.length}{" "}
                                  {categoryResponses.length === 1
                                    ? t("reviewAssessments.question", {
                                        defaultValue: "question",
                                      })
                                    : "questions"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsAddingRecommendation(category);
                                  setCurrentComment("");
                                }}
                                className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                              >
                                <Plus className="w-4 h-4" />
                                <span>
                                  {t("reviewAssessments.addRecommendation", {
                                    defaultValue: "Add Recommendation",
                                  })}
                                </span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newExpanded = new Set(
                                    expandedCategories
                                  );
                                  if (newExpanded.has(category)) {
                                    newExpanded.delete(category);
                                  } else {
                                    newExpanded.add(category);
                                  }
                                  setExpandedCategories(newExpanded);
                                }}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                              >
                                {expandedCategories.has(category) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <span className="text-sm">
                                  {expandedCategories.has(category)
                                    ? t("reviewAssessments.collapse", {
                                        defaultValue: "Collapse",
                                      })
                                    : t("reviewAssessments.expand", {
                                        defaultValue: "Expand",
                                      })}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        {recsForCategory.length > 0 && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg">
                            <div className="flex items-center space-x-2 mb-3">
                              <Award className="w-4 h-4 text-blue-600" />
                              <p className="text-sm font-medium text-gray-900">
                                {t("reviewAssessments.yourRecommendations", {
                                  defaultValue: "Your Recommendations:",
                                })}
                              </p>
                            </div>
                            <div className="space-y-3">
                              {recsForCategory.map((rec) => (
                                <div
                                  key={rec.id}
                                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200 shadow-sm"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-700">
                                      {rec.recommendation}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {t("reviewAssessments.addedAt", {
                                        defaultValue: "Added at",
                                      })}{" "}
                                      {rec.timestamp.toLocaleTimeString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      removeCategoryRecommendation(rec.id)
                                    }
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isAddingRecommendation === category && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg">
                            <div className="flex items-center space-x-2 mb-3">
                              <Plus className="w-4 h-4 text-green-600" />
                              <p className="text-sm font-medium text-gray-900">
                                {t("reviewAssessments.addRecommendationFor", {
                                  defaultValue: "Add Recommendation for",
                                })}{" "}
                                {category}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                  {t("reviewAssessments.recommendation", {
                                    defaultValue: "Recommendation",
                                  })}
                                </label>
                                <Textarea
                                  value={currentComment}
                                  onChange={(e) =>
                                    setCurrentComment(e.target.value)
                                  }
                                  placeholder={`${t(
                                    "reviewAssessments.enterRecommendationFor",
                                    {
                                      defaultValue:
                                        "Enter your recommendation for",
                                    }
                                  )} ${category} ${t(
                                    "reviewAssessments.category",
                                    { defaultValue: "category" }
                                  )}...`}
                                  className="min-h-[100px] resize-none border-gray-300 focus:border-green-500 focus:ring-green-500"
                                  rows={3}
                                />
                              </div>
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() => {
                                    if (currentComment.trim()) {
                                      addCategoryRecommendation(
                                        category,
                                        currentComment
                                      );
                                      setCurrentComment("");
                                      setIsAddingRecommendation("");
                                    }
                                  }}
                                  disabled={!currentComment.trim()}
                                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>
                                    {t("reviewAssessments.addRecommendation", {
                                      defaultValue: "Add Recommendation",
                                    })}
                                  </span>
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCurrentComment("");
                                    setIsAddingRecommendation("");
                                  }}
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  {t("reviewAssessments.cancel", {
                                    defaultValue: "Cancel",
                                  })}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {expandedCategories.has(category) ? (
                          <div className="space-y-4">
                            {categoryResponses.map((response, index) => {
                              let responseData;
                              try {
                                responseData = JSON.parse(response.response);
                              } catch (error) {
                                console.error(
                                  "Failed to parse response data:",
                                  error
                                );
                                responseData = { text: response.response };
                              }
                              return (
                                <div
                                  key={index}
                                  className="bg-gray-50 p-4 rounded-lg"
                                >
                                  <div className="mb-3">
                                    <h4 className="font-medium text-gray-900 mb-2">
                                      {response.question_text}
                                    </h4>
                                    <div className="space-y-2">
                                      {responseData.yesNo !== undefined && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-gray-700">
                                            {t("reviewAssessments.yesNo", {
                                              defaultValue: "Yes/No:",
                                            })}
                                          </span>
                                          <Badge
                                            variant={
                                              responseData.yesNo
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {responseData.yesNo
                                              ? t("reviewAssessments.yes", {
                                                  defaultValue: "Yes",
                                                })
                                              : t("reviewAssessments.no", {
                                                  defaultValue: "No",
                                                })}
                                          </Badge>
                                        </div>
                                      )}
                                      {responseData.percentage !==
                                        undefined && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-gray-700">
                                            {t(
                                              "reviewAssessments.percentage",
                                              { defaultValue: "Percentage:" }
                                            )}
                                          </span>
                                          <Badge variant="outline">
                                            {responseData.percentage}%
                                          </Badge>
                                        </div>
                                      )}
                                      {responseData.text && (
                                        <div>
                                          <span className="text-sm font-medium text-gray-700">
                                            {t("reviewAssessments.response", {
                                              defaultValue: "Response:",
                                            })}
                                          </span>
                                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                                            {responseData.text}
                                          </p>
                                        </div>
                                      )}
                                      {responseData.files &&
                                        responseData.files.length > 0 && (
                                          <FileDisplay
                                            files={
                                              responseData.files as FileAttachment[]
                                            }
                                            title={t(
                                              "reviewAssessments.attachments",
                                              { defaultValue: "Attachments" }
                                            )}
                                          />
                                        )}
                                    </div>

                                    {response.files &&
                                      response.files.length > 0 && (
                                        <FileDisplay
                                          files={
                                            response.files as FileAttachment[]
                                          }
                                          title={t(
                                            "reviewAssessments.attachments",
                                            { defaultValue: "Attachments" }
                                          )}
                                        />
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              {t("reviewAssessments.clickExpandToView", {
                                defaultValue: 'Click "Expand" to view',
                              })}{" "}
                              {categoryResponses.length}{" "}
                              {categoryResponses.length === 1
                                ? t("reviewAssessments.question", {
                                    defaultValue: "question",
                                  })
                                : "questions"}
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t("reviewAssessments.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                onClick={() => handleSubmitReview("approved")}
                disabled={isSubmitting || categoryRecommendations.length === 0}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
                <span>
                  {t("reviewAssessments.submitReview", {
                    defaultValue: "Submit Review",
                  })}
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};