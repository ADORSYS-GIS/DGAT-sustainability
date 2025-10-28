import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailedReport, OfflineRecommendation } from "@/types/offline"; // Import DetailedReport
import {
  AlertCircle,
  CheckCircle,
  Kanban,
  PlayCircle,
  ThumbsUp
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "../../hooks/shared/useAuth"; // Import useAuth hook
import { useOfflineRecommendationStatusMutation, useOfflineReport } from "@/hooks/useOfflineReports";
import { useParams } from "react-router-dom";

export const ActionPlan: React.FC = () => {
  const { t } = useTranslation();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data, isLoading, error } = useOfflineReport(submissionId);
  const { updateRecommendationStatus } = useOfflineRecommendationStatusMutation();
  const { roles } = useAuth();
  const isAdmin = roles.includes("org_admin");

  type KanbanRecommendation = OfflineRecommendation & { id: string; assessment_name?: string };

  const groupRecommendationsByAssessment = (
    report: DetailedReport,
  ): Record<string, KanbanRecommendation[]> => {
    const grouped: Record<string, KanbanRecommendation[]> = {};

    if (report?.data) {
      report.data.forEach((categoryData) => {
        Object.keys(categoryData).forEach((category) => {
          const recommendations = categoryData[category]?.recommendations;
          if (recommendations) {
            recommendations.forEach((rec) => {
              if (rec.text !== "No recommendation provided") {
                const assessmentName = report.assessment_name || "Unknown Assessment";
                if (!grouped[assessmentName]) {
                  grouped[assessmentName] = [];
                }
                grouped[assessmentName].push({
                  recommendation_id: rec.id,
                  report_id: report.report_id,
                  category,
                  recommendation: rec.text,
                  status: rec.status,
                  id: rec.id,
                  assessment_name: assessmentName,
                } as KanbanRecommendation);
              }
            });
          }
        });
      });
    }
    return grouped;
  };

  const [groupedRecs, setGroupedRecs] = React.useState<
    Record<string, KanbanRecommendation[]>
  >({});

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
      toast.error("Recommendation not found.");
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
            toast.success("Status updated successfully");
          },
          onError: (error) => {
            console.error("Failed to update status:", error);
            toast.error("Failed to update status");
          },
        },
      );
    } catch (error) {
      console.error("Unhandled error in moveRecommendation:", error);
      toast.error("Failed to update status");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
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

          {/* Kanban Board */}
          {Object.keys(groupedRecs).length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <Kanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t("user.actionPlan.noRecommendations", { defaultValue: "No Recommendations Available" })}
              </h2>
              <p className="text-gray-600">
                {t("user.actionPlan.noRecommendationsDescription", { defaultValue: "There are no recommendations for this submission." })}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRecs).map(([assessmentName, recs]) => (
                <div key={assessmentName}>
                  <h2 className="text-2xl font-bold text-dgrv-blue mb-4">{assessmentName}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {columns.map((column) => {
                      const columnTasks = recs.filter(
                        (rec) => rec.status === column.id,
                      );
                      const IconComponent = column.icon;
                      return (
                        <Card key={column.id} className="animate-fade-in">
                          <CardHeader className="pb-3">
                            <CardTitle
                              className={`flex items-center space-x-2 ${column.color}`}
                            >
                              <IconComponent className="w-5 h-5" />
                              <span>{column.title}</span>
                              <Badge variant="outline" className="ml-auto">
                                {columnTasks.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {columnTasks.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <column.icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                  {t("user.actionPlan.kanban.noTasks", { status: column.id, defaultValue: `No tasks in ${column.title.toLowerCase()}` })}
                                </p>
                              </div>
                            ) : (
                              columnTasks.map((task) => (
                                <Card
                                  key={task.id}
                                  className={getStatusColor(task.status)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-1">
                                      <div className="font-bold text-dgrv-blue mb-1">
                                        {task.category}
                                      </div>
                                      <div className="text-sm text-gray-900 mb-2">
                                        {task.recommendation}
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        {isAdmin && task.status === "todo" && (
                                          <button
                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                            onClick={() =>
                                              moveRecommendation(
                                                assessmentName,
                                                task.id,
                                                "in_progress",
                                              )
                                            }
                                          >
                                            {t("user.actionPlan.kanban.moveToInProgress", { defaultValue: "Move to In Progress" })}
                                          </button>
                                        )}
                                        {isAdmin &&
                                          task.status === "in_progress" && (
                                            <>
                                              <button
                                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                onClick={() =>
                                                  moveRecommendation(
                                                    assessmentName,
                                                    task.id,
                                                    "todo",
                                                  )
                                                }
                                              >
                                                {t("user.actionPlan.kanban.backToTodo", { defaultValue: "Back to To Do" })}
                                              </button>
                                              <button
                                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                onClick={() =>
                                                  moveRecommendation(
                                                    assessmentName,
                                                    task.id,
                                                    "done",
                                                  )
                                                }
                                              >
                                                {t("user.actionPlan.kanban.moveToDone", { defaultValue: "Move to Done" })}
                                              </button>
                                            </>
                                          )}
                                        {isAdmin && task.status === "done" && (
                                          <>
                                            <button
                                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                              onClick={() =>
                                                moveRecommendation(
                                                  assessmentName,
                                                  task.id,
                                                  "in_progress",
                                                )
                                              }
                                            >
                                              {t("user.actionPlan.kanban.backToInProgress", { defaultValue: "Back to In Progress" })}
                                            </button>
                                            <button
                                              className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                              onClick={() =>
                                                moveRecommendation(
                                                  assessmentName,
                                                  task.id,
                                                  "approved",
                                                )
                                              }
                                            >
                                              Approve
                                            </button>
                                          </>
                                        )}
                                        {isAdmin &&
                                          task.status === "approved" && (
                                            <button
                                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                              onClick={() =>
                                                moveRecommendation(
                                                  assessmentName,
                                                  task.id,
                                                  "done",
                                                )
                                              }
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
                          </CardContent>
                        </Card>
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
  );
};
