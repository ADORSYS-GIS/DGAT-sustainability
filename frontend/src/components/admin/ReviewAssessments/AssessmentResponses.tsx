/*
 * Assessment responses component for review dialog
 * Displays grouped responses by category with recommendation management
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

interface AssessmentResponsesProps {
  submissionResponses: Array<{
    question_category: string;
    response: string;
    question_text: string;
  }>;
  categoryRecommendations: CategoryRecommendation[];
  currentComment: string;
  setCurrentComment: (comment: string) => void;
  isAddingRecommendation: string;
  setIsAddingRecommendation: (category: string) => void;
  expandedCategories: Set<string>;
  setExpandedCategories: (categories: Set<string>) => void;
  onAddRecommendation: (category: string, recommendation: string) => void;
  onRemoveRecommendation: (id: string) => void;
}

export const AssessmentResponses: React.FC<AssessmentResponsesProps> = ({
  submissionResponses,
  categoryRecommendations,
  currentComment,
  setCurrentComment,
  isAddingRecommendation,
  setIsAddingRecommendation,
  expandedCategories,
  setExpandedCategories,
  onAddRecommendation,
  onRemoveRecommendation,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span>
            {t("reviewAssessments.assessmentResponses", {
              defaultValue: "Assessment Responses",
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissionResponses.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {t("reviewAssessments.noResponsesFound", {
                defaultValue: "No responses found",
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group responses by category */}
            {(() => {
              const categories = [
                ...new Set(submissionResponses.map((r) => r.question_category)),
              ];
              return categories.map((category) => {
                const categoryResponses = submissionResponses.filter(
                  (r) => r.question_category === category,
                );
                const recsForCategory = categoryRecommendations.filter(
                  (r) => r.category === category,
                );

                return (
                  <div
                    key={category}
                    className="border rounded-xl p-6 bg-gradient-to-r from-gray-50 to-white shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {category.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 capitalize">
                          {category} Category
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({categoryResponses.length} questions)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {recsForCategory.length > 0 && (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {recsForCategory.length} Recommendation
                            {recsForCategory.length > 1 ? "s" : ""}
                          </Badge>
                        )}
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
                            const newExpanded = new Set(expandedCategories);
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

                    {/* Category recommendation display */}
                    {recsForCategory.length > 0 && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-sm font-medium text-gray-900">
                            {t("reviewAssessments.yourRecommendations", {
                              defaultValue: "Your Recommendations:",
                            })}
                          </span>
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
                                onClick={() => onRemoveRecommendation(rec.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Recommendation Form for this category */}
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
                              placeholder={`${t("reviewAssessments.enterRecommendationFor", { defaultValue: "Enter your recommendation for" })} ${category} ${t("reviewAssessments.category", { defaultValue: "category" })}...`}
                              className="min-h-[100px] resize-none border-gray-300 focus:border-green-500 focus:ring-green-500"
                              rows={3}
                            />
                          </div>
                          <div className="flex space-x-3">
                            <Button
                              onClick={() => {
                                if (currentComment.trim()) {
                                  onAddRecommendation(category, currentComment);
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

                    {/* Questions in this category - Collapsible */}
                    {expandedCategories.has(category) ? (
                      <div className="space-y-4">
                        {categoryResponses.map((response, index) => {
                          // Parse the response JSON to get the actual response data
                          let responseData;
                          try {
                            responseData = JSON.parse(response.response);
                          } catch (e) {
                            responseData = { text: response.response };
                          }

                          return (
                            <div
                              key={index}
                              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                            >
                              <h4 className="font-medium text-gray-900 mb-3 text-lg">
                                {response.question_text}
                              </h4>

                              {/* Display response data */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                {responseData.yesNo !== undefined && (
                                  <div className="flex items-center space-x-2 mb-2">
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
                                      className={
                                        responseData.yesNo
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
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
                                {responseData.percentage !== undefined && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      {t("reviewAssessments.percentage", {
                                        defaultValue: "Percentage:",
                                      })}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      {responseData.percentage}%
                                    </Badge>
                                  </div>
                                )}
                                {responseData.text && (
                                  <div className="mt-3">
                                    <span className="text-sm font-medium text-gray-700">
                                      {t("reviewAssessments.response", {
                                        defaultValue: "Response:",
                                      })}
                                    </span>
                                    <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border">
                                      {responseData.text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">
                          {t("reviewAssessments.clickExpandToView", {
                            defaultValue: 'Click "Expand" to view',
                          })}{" "}
                          {categoryResponses.length}{" "}
                          {t("reviewAssessments.question", {
                            defaultValue: "question",
                          })}
                          {categoryResponses.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
