import { Navbar } from "@/components/shared/Navbar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailedReport, OfflineRecommendation, ReportCategoryContent } from "@/types/offline"; // Import types
import {
  AlertCircle,
  CheckCircle,
  Kanban,
  PlayCircle,
  ThumbsUp,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "../../hooks/shared/useAuth"; // Import useAuth hook
import { useOfflineRecommendationStatusMutation, useOfflineReport } from "@/hooks/useOfflineReports";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import { useParams } from "react-router-dom";

export const ActionPlan: React.FC = () => {
  const { t } = useTranslation();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data, isLoading, error } = useOfflineReport(submissionId);
  const { updateRecommendationStatus } = useOfflineRecommendationStatusMutation();
  const { isOnline } = useOfflineSyncStatus();
  const { roles } = useAuth();
  const isAdmin = roles.includes("org_admin") || roles.includes("Org_admin");

  const { data: questionsData } = useOfflineQuestions();
  const { data: categoriesData } = useOfflineCategoryCatalogs();

  const [questionsTextMap, qRevToCategoryMap] = React.useMemo(() => {
    const textMap = new Map<string, string>(); // question text -> category name
    const catMap = new Map<string, string>();

    // Create a mapping from category_id to category name
    const categoryIdToName = new Map<string, string>();
    const categoryNameToId = new Map<string, string>();
    if (categoriesData) {
      categoriesData.forEach(cat => {
        categoryIdToName.set(cat.category_catalog_id, cat.name);
        categoryNameToId.set(cat.name.toLowerCase(), cat.category_catalog_id);
      });
    }

    if (questionsData) {
      questionsData.forEach(q => {
        if (q.latest_revision) {
          const revId = q.latest_revision.question_revision_id;

          const qText = (q.latest_revision.text as { en?: string })?.en || '';

          // Map the revision ID to the actual proper category name
          let catName = 'Uncategorized';
          const qCat = q.category || q.category_id;
          if (qCat) {
            if (categoryIdToName.has(qCat)) {
              catName = categoryIdToName.get(qCat)!;
            } else if (categoryNameToId.has(qCat.toLowerCase())) {
              catName = categoryIdToName.get(categoryNameToId.get(qCat.toLowerCase())!) || qCat;
            } else {
              catName = qCat;
            }
          }
          catMap.set(revId, catName);
          if (qText) {
            textMap.set(qText, catName);
          }
        }
      });
    }
    return [textMap, catMap];
  }, [questionsData, categoriesData]);

  type KanbanRecommendation = OfflineRecommendation & { id: string; assessment_name?: string; created_at: string };

  const groupRecommendationsByAssessment = (
    report: DetailedReport,
  ): Record<string, KanbanRecommendation[]> => {
    const grouped: Record<string, KanbanRecommendation[]> = {};

    if (report?.data) {
      // Handle both array and object formats for robustness
      // API normally sends an array of objects: [{ "Category": { ... } }]
      // But some legacy or cached data might be an object: { "Category": { ... } }
      const dataItems = Array.isArray(report.data)
        ? report.data
        : Object.entries(report.data).map(([key, value]) => ({ [key]: value }));

      const allRecommendations: KanbanRecommendation[] = [];

      dataItems.forEach((categoryData) => {
        Object.keys(categoryData).forEach((categoryKey) => {
          let category = categoryKey.trim(); // Trim category key
          const categoryContent = categoryData[categoryKey] as ReportCategoryContent;

          // If category is "Unknown" or empty, try to resolve it from the questions in this category
          if (!category || category.toLowerCase() === 'uncategorized' || category.toLowerCase().includes('unknown')) {
            if (categoryContent.questions && categoryContent.questions.length > 0) {
              const firstQName = categoryContent.questions[0].question;
              if (questionsTextMap.has(firstQName)) {
                category = questionsTextMap.get(firstQName)!;
              }
            }
          }

          // Normalize category name to prevent duplicates
          category = category.trim().replace(/\s+/g, ' '); // Remove extra spaces

          const recommendations = categoryContent?.recommendations;
          if (recommendations) {
            recommendations.forEach((rec) => {
              if (rec.text !== "No recommendation provided" && rec.text !== "No action plan given") {
                const assessmentName = report.assessment_name || "Unknown Assessment";
                allRecommendations.push({
                  recommendation_id: rec.id,
                  report_id: report.report_id,
                  category,
                  recommendation: rec.text,
                  status: rec.status,
                  id: rec.id,
                  assessment_name: assessmentName,
                  created_at: report.generated_at || new Date().toISOString(),
                } as KanbanRecommendation);
              }
            });
          }
        });
      });

      // Deduplicate recommendations by category + recommendation text (same logic as admin)
      const deduplicatedMap = new Map<string, KanbanRecommendation>();

      allRecommendations.forEach((rec) => {
        const normalizedCategory = rec.category.toLowerCase().trim();
        const key = `${normalizedCategory}-${rec.recommendation.toLowerCase().trim()}`;

        // Keep the most recent recommendation if duplicates exist
        if (!deduplicatedMap.has(key) ||
          new Date(rec.created_at) > new Date(deduplicatedMap.get(key)!.created_at)) {
          deduplicatedMap.set(key, rec);
        }
      });

      // Group deduplicated recommendations by assessment
      Array.from(deduplicatedMap.values()).forEach((rec) => {
        const assessmentName = rec.assessment_name || "Unknown Assessment";
        if (!grouped[assessmentName]) {
          grouped[assessmentName] = [];
        }
        grouped[assessmentName].push(rec);
      });
    }
    return grouped;
  };

  const [groupedRecs, setGroupedRecs] = React.useState<
    Record<string, KanbanRecommendation[]>
  >({});
  const [selectedTask, setSelectedTask] = React.useState<KanbanRecommendation | null>(null);

  React.useEffect(() => {
    if (data?.report) {
      setGroupedRecs(groupRecommendationsByAssessment(data.report));
    }
  }, [data]);

  const columns = [
    { id: "todo", title: t("user.dashboard.actionPlan.kanban.todo", { defaultValue: "To Do" }), icon: AlertCircle, color: "text-gray-600" },
    { id: "in_progress", title: t("user.dashboard.actionPlan.kanban.inProgress", { defaultValue: "In Progress" }), icon: PlayCircle, color: "text-blue-600" },
    { id: "done", title: t("user.dashboard.actionPlan.kanban.done", { defaultValue: "Done" }), icon: CheckCircle, color: "text-green-600" },
    { id: "approved", title: t("user.dashboard.actionPlan.kanban.approved", { defaultValue: "Approved" }), icon: ThumbsUp, color: "text-emerald-600" },
  ];

  const moveRecommendation = async (
    assessmentName: string,
    id: string,
    newStatus: "todo" | "in_progress" | "done" | "approved",
  ) => {
    setGroupedRecs((prev) => {
      const newGroupedRecs = { ...prev };
      const recs = newGroupedRecs[assessmentName];
      const recIndex = recs.findIndex((rec) => rec.id === id);
      if (recIndex > -1) {
        recs[recIndex] = { ...recs[recIndex], status: newStatus };
      }
      return newGroupedRecs;
    });

    const recommendationToUpdate = groupedRecs[assessmentName]?.find(
      (rec) => rec.id === id,
    );

    if (!recommendationToUpdate) {
      toast.error(t("staticText.actionPlan.recommendationNotFound", { defaultValue: "Recommendation not found." }));
      return;
    }

    try {
      await updateRecommendationStatus(
        recommendationToUpdate.report_id,
        recommendationToUpdate.category,
        recommendationToUpdate.recommendation_id,
        newStatus,
        {
          onSuccess: () => {
            toast.success(t("staticText.actionPlan.statusUpdateSuccess", { defaultValue: "Status updated successfully" }));
          },
          onError: (error) => {
            console.error("Failed to update status:", error);
            toast.error(t("staticText.actionPlan.statusUpdateError", { defaultValue: "Failed to update status" }));
          },
        },
      );
    } catch (error) {
      console.error("Unhandled error in moveRecommendation:", error);
      toast.error(t("staticText.actionPlan.statusUpdateError", { defaultValue: "Failed to update status" }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case "in_progress":
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "approved":
        return <ThumbsUp className="w-4 h-4 text-emerald-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 border-gray-300";
      case "in_progress":
        return "bg-blue-50 border-blue-300";
      case "done":
        return "bg-green-50 border-green-300";
      case "approved":
        return "bg-emerald-50 border-emerald-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  if (isLoading && !data?.report) {
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">{t("error.title", { defaultValue: "An Error Occurred" })}</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-dgrv-blue text-white rounded hover:bg-blue-700"
            >
              {t("error.goBack", { defaultValue: "Go Back" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Kanban className="w-8 h-8 text-dgrv-blue" />
                    <h1 className="text-3xl font-bold text-dgrv-blue">
                      {t("user.actionPlan.title", { defaultValue: "Action Plan" })}
                    </h1>
                  </div>
                  <p className="text-lg text-gray-600">
                    {t("user.dashboard.actionPlan.subtitle", { defaultValue: "Track your sustainability improvement tasks" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full">
            {Object.keys(groupedRecs).length === 0 && !isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Kanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {t("user.actionPlan.noRecommendations", { defaultValue: "No Recommendations Available" })}
                  </h2>
                  <p className="text-gray-600">
                    {t("user.actionPlan.noRecommendationsDescription", { defaultValue: "There are no recommendations for this submission." })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {Object.entries(groupedRecs).map(([assessmentName, recs]) => (
                  <div key={assessmentName} className="h-full flex flex-col">
                    <h2 className="text-2xl font-bold text-dgrv-blue mb-4 flex-shrink-0">{assessmentName}</h2>

                    {/* Kanban Columns */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6" style={{ minHeight: 0 }}>
                      {columns.map((column) => {
                        const columnTasks = recs.filter(
                          (rec) => rec.status === column.id,
                        );
                        const IconComponent = column.icon;
                        return (
                          <div key={column.id} className="flex flex-col" style={{ minHeight: 0 }}>
                            <Card className="flex flex-col h-full">
                              <CardHeader className="pb-3 flex-shrink-0">
                                <CardTitle className={`flex items-center space-x-2 ${column.color}`}>
                                  <IconComponent className="w-5 h-5" />
                                  <span>{column.title}</span>
                                  <Badge variant="outline" className="ml-auto">
                                    {columnTasks.length}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="flex-1 p-4" style={{ minHeight: 0 }}>
                                <div
                                  className="space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                                  style={{
                                    height: '100%',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    paddingRight: '8px'
                                  }}
                                >
                                  {columnTasks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                      <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">
                                        {t("user.actionPlan.kanban.noTasks", { status: column.id, defaultValue: `No tasks in ${column.title.toLowerCase()}` })}
                                      </p>
                                    </div>
                                  ) : (
                                    columnTasks.map((task) => (
                                      <Card
                                        key={task.id}
                                        className={`${getStatusColor(task.status)} flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow`}
                                        onClick={() => setSelectedTask(task)}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="font-bold text-dgrv-blue text-xs uppercase tracking-wider truncate">
                                                {task.category}
                                              </div>
                                              <Eye className="w-3 h-3 text-gray-400" />
                                            </div>
                                            <div className="text-sm text-gray-900 mb-2 line-clamp-3 leading-relaxed">
                                              {task.recommendation}
                                            </div>
                                            <div className="flex gap-2 mt-auto pt-2 border-t border-black/5">
                                              {isAdmin && task.status === "todo" && (
                                                <button
                                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveRecommendation(assessmentName, task.id, "in_progress");
                                                  }}
                                                >
                                                  {t("user.actionPlan.kanban.moveToInProgress", { defaultValue: "Move to In Progress" })}
                                                </button>
                                              )}
                                              {isAdmin && task.status === "in_progress" && (
                                                <>
                                                  <button
                                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveRecommendation(assessmentName, task.id, "todo");
                                                    }}
                                                  >
                                                    {t("user.actionPlan.kanban.backToTodo", { defaultValue: "Back to To Do" })}
                                                  </button>
                                                  <button
                                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveRecommendation(assessmentName, task.id, "done");
                                                    }}
                                                  >
                                                    {t("user.actionPlan.kanban.moveToDone", { defaultValue: "Move to Done" })}
                                                  </button>
                                                </>
                                              )}
                                              {isAdmin && task.status === "done" && (
                                                <>
                                                  <button
                                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveRecommendation(assessmentName, task.id, "in_progress");
                                                    }}
                                                  >
                                                    {t("user.actionPlan.kanban.backToInProgress", { defaultValue: "Back to In Progress" })}
                                                  </button>
                                                  <button
                                                    className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      moveRecommendation(assessmentName, task.id, "approved");
                                                    }}
                                                  >
{t("user.actionPlan.kanban.approve", { defaultValue: "Approve" })}
                                                  </button>
                                                </>
                                              )}
                                              {isAdmin && task.status === "approved" && (
                                                <button
                                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveRecommendation(assessmentName, task.id, "done");
                                                  }}
                                                >
                                                  {t("user.actionPlan.kanban.backToDone", { defaultValue: "Back to Done" })}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {selectedTask && getStatusIcon(selectedTask.status)}
              <Badge variant="outline" className="text-xs">
                {selectedTask && columns.find(c => c.id === selectedTask.status)?.title}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold text-dgrv-blue">
              {selectedTask?.category}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
              {t("staticText.actionPlan.recommendation", { defaultValue: "Recommendation" })}
            </h4>
            <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">
              {selectedTask?.recommendation}
            </div>

            {selectedTask && (
              <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t">
                {isAdmin && selectedTask.status === "todo" && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "in_progress");
                      setSelectedTask(null);
                    }}
                  >
                    {t("user.actionPlan.kanban.moveToInProgress", { defaultValue: "Move to In Progress" })}
                  </Button>
                )}
                {isAdmin && selectedTask.status === "in_progress" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "todo");
                        setSelectedTask(null);
                      }}
                    >
                      {t("user.actionPlan.kanban.backToTodo", { defaultValue: "Back to To Do" })}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "done");
                        setSelectedTask(null);
                      }}
                    >
                      {t("user.actionPlan.kanban.moveToDone", { defaultValue: "Move to Done" })}
                    </Button>
                  </>
                )}
                {isAdmin && selectedTask.status === "done" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "in_progress");
                        setSelectedTask(null);
                      }}
                    >
                      {t("user.actionPlan.kanban.backToInProgress", { defaultValue: "Back to In Progress" })}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "approved");
                        setSelectedTask(null);
                      }}
                    >
                      {t("staticText.actionPlan.approve", { defaultValue: "Approve" })}
                    </Button>
                  </>
                )}
                {isAdmin && selectedTask.status === "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      moveRecommendation(selectedTask.assessment_name || "", selectedTask.id, "done");
                      setSelectedTask(null);
                    }}
                  >
                    {t("user.actionPlan.kanban.backToDone", { defaultValue: "Back to Done" })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
