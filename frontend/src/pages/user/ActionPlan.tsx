/*
 * User action plan page that displays recommendations in a Kanban board format
 * Provides task management interface for tracking recommendation implementation status
 */

import { Navbar } from "@/components/shared/Navbar";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Kanban,
  PlayCircle,
  ThumbsUp,
} from "lucide-react";
import * as React from "react";
import { useOfflineReports } from "../../hooks/useOfflineApi";

export const ActionPlan: React.FC = () => {
  const { t } = useTranslation();
  // Fetch all user reports
  const { data, isLoading } = useOfflineReports();

  // Flat recommendation type for Kanban with status
  type KanbanRecommendation = {
    id: string; // unique id for React key
    category: string;
    recommendation: string;
    status: string; // 'todo', 'in_progress', 'done', 'approved'
  };
  // Extract and flatten recommendations from all reports (fixed for actual data structure)
  const extractRecommendations = (): KanbanRecommendation[] => {
    if (!data?.reports) return [];
    let idx = 0;
    return data.reports.flatMap((report) => {
      if (Array.isArray(report.data)) {
        return report.data.flatMap((catObj) => {
          if (catObj && typeof catObj === "object") {
            return Object.entries(catObj)
              .map(([category, value]) => {
                if (
                  value &&
                  typeof value === "object" &&
                  "recommendation" in value &&
                  typeof value.recommendation === "string"
                ) {
                  return {
                    id: `${report.report_id}-${category}-${idx++}`,
                    category,
                    recommendation: value.recommendation,
                    status: "todo",
                  };
                }
                return null;
              })
              .filter(Boolean) as KanbanRecommendation[];
          }
          return [];
        });
      }
      return [];
    });
  };
  // State for Kanban recommendations
  const [kanbanRecs, setKanbanRecs] = React.useState<KanbanRecommendation[]>(
    [],
  );
  // On data load, initialize state (only once)
  React.useEffect(() => {
    if (kanbanRecs.length === 0 && data?.reports) {
      setKanbanRecs(extractRecommendations());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Columns for Kanban
  const columns = [
    {
      id: "todo",
      title: t("user.dashboard.actionPlan.kanban.todo", {
        defaultValue: "To Do",
      }),
      icon: AlertCircle,
      color: "text-gray-600",
    },
    {
      id: "in_progress",
      title: t("user.dashboard.actionPlan.kanban.inProgress", {
        defaultValue: "In Progress",
      }),
      icon: PlayCircle,
      color: "text-blue-600",
    },
    {
      id: "done",
      title: t("user.dashboard.actionPlan.kanban.done", {
        defaultValue: "Done",
      }),
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      id: "approved",
      title: t("user.dashboard.actionPlan.kanban.approved", {
        defaultValue: "Approved",
      }),
      icon: ThumbsUp,
      color: "text-emerald-600",
    },
  ];

  // Filter recommendations by status
  const getTasksByStatus = (status: string) =>
    kanbanRecs.filter((rec) => rec.status === status);

  // Move a recommendation to a new status
  const moveRecommendation = (id: string, newStatus: string) => {
    setKanbanRecs((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: newStatus } : rec)),
    );
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
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Remove online status indicator */}

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Kanban className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t("user.actionPlan.title", {
                      defaultValue: "Action Plan",
                    })}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t("user.dashboard.actionPlan.subtitle", {
                    defaultValue: "Track your sustainability improvement tasks",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
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
                          {t("user.actionPlan.kanban.noTasks", {
                            status: column.id,
                            defaultValue: `No tasks in ${column.title.toLowerCase()}`,
                          })}
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
                                {task.status === "todo" && (
                                  <button
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    onClick={() =>
                                      moveRecommendation(task.id, "in_progress")
                                    }
                                  >
                                    {t(
                                      "user.actionPlan.kanban.moveToInProgress",
                                      { defaultValue: "Move to In Progress" },
                                    )}
                                  </button>
                                )}
                                {task.status === "in_progress" && (
                                  <>
                                    <button
                                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                      onClick={() =>
                                        moveRecommendation(task.id, "todo")
                                      }
                                    >
                                      {t("user.actionPlan.kanban.backToTodo", {
                                        defaultValue: "Back to To Do",
                                      })}
                                    </button>
                                    <button
                                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                      onClick={() =>
                                        moveRecommendation(task.id, "done")
                                      }
                                    >
                                      {t("user.actionPlan.kanban.moveToDone", {
                                        defaultValue: "Move to Done",
                                      })}
                                    </button>
                                  </>
                                )}
                                {task.status === "done" && (
                                  <>
                                    <button
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      onClick={() =>
                                        moveRecommendation(
                                          task.id,
                                          "in_progress",
                                        )
                                      }
                                    >
                                      {t(
                                        "user.actionPlan.kanban.backToInProgress",
                                        { defaultValue: "Back to In Progress" },
                                      )}
                                    </button>
                                    <button
                                      className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                      onClick={() =>
                                        moveRecommendation(task.id, "approved")
                                      }
                                    >
                                      Approve
                                    </button>
                                  </>
                                )}
                                {task.status === "approved" && (
                                  <button
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    onClick={() =>
                                      moveRecommendation(task.id, "done")
                                    }
                                  >
                                    {t("user.actionPlan.kanban.backToDone", {
                                      defaultValue: "Back to Done",
                                    })}
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
      </div>
    </div>
  );
};
