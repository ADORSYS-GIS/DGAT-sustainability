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
import { useOfflineRecommendationStatusMutation, useOfflineUserRecommendations } from "../../hooks/useOfflineApi";

export const ActionPlan: React.FC = () => {
  const { t } = useTranslation();
  // Fetch all user reports
  const { data, isLoading } = useOfflineUserRecommendations();
  const { updateRecommendationStatus } = useOfflineRecommendationStatusMutation();
  const { roles } = useAuth(); // Get user roles
  const isAdmin = roles.includes("org_admin"); // Check if user is an organization admin

  // Flat recommendation type for Kanban with status
  // Type for Kanban recommendations
  type KanbanRecommendation = OfflineRecommendation & { id: string }; // Add a local 'id' for React keys
  
  // Extract and flatten recommendations from all reports (fixed for actual data structure)
  const extractRecommendations = (reports: DetailedReport[]): KanbanRecommendation[] => {
    const allRecommendations: KanbanRecommendation[] = [];

    if (!reports || !Array.isArray(reports)) {
      return allRecommendations;
    }

    reports.forEach((report) => {
      if (report.data && Array.isArray(report.data)) {
        report.data.forEach((categoryData) => {
          Object.keys(categoryData).forEach((category) => {
            const recommendations = categoryData[category]?.recommendations;
            if (recommendations && Array.isArray(recommendations)) {
              recommendations.forEach((rec) => {
                // Use the ID from the backend directly
                const recommendation_id = rec.id;
                allRecommendations.push({
                  recommendation_id: recommendation_id,
                  report_id: report.report_id,
                  category,
                  recommendation: rec.text,
                  status: rec.status,
                  id: recommendation_id, // For React key
                } as KanbanRecommendation);
              });
            }
          });
        });
      }
    });

    return allRecommendations;
  };
  // State for Kanban recommendations
  const [kanbanRecs, setKanbanRecs] = React.useState<KanbanRecommendation[]>(
    [],
  );
  // On data load, initialize state (only once)
  // On data load, initialize state (only once)
  React.useEffect(() => {
    if (data?.reports) {
      setKanbanRecs(extractRecommendations(data.reports));
    }
  }, [data]); // Depend on data to re-run when recommendations change

  // Columns for Kanban
  const columns = [
    { id: "todo", title: t("user.dashboard.actionPlan.kanban.todo", { defaultValue: "To Do" }), icon: AlertCircle, color: "text-gray-600" },
    {
      id: "in_progress",
      title: t("user.dashboard.actionPlan.kanban.inProgress", { defaultValue: "In Progress" }),
      icon: PlayCircle,
      color: "text-blue-600",
    },
    { id: "done", title: t("user.dashboard.actionPlan.kanban.done", { defaultValue: "Done" }), icon: CheckCircle, color: "text-green-600" },
    {
      id: "approved",
      title: t("user.dashboard.actionPlan.kanban.approved", { defaultValue: "Approved" }),
      icon: ThumbsUp,
      color: "text-emerald-600",
    },
  ];

  // Filter recommendations by status
  const getTasksByStatus = (status: string) =>
    kanbanRecs.filter((rec) => rec.status === status);

  // Move a recommendation to a new status
  const moveRecommendation = async (id: string, newStatus: "todo" | "in_progress" | "done" | "approved") => {
    // Update local state immediately for better UX
    setKanbanRecs((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: newStatus } : rec)),
    );

    // Extract report_id and category from the id
    // The `id` here is actually the `recommendation_id` from OfflineRecommendation
    // We need to find the full recommendation object to get report_id and category
    const recommendationToUpdate = kanbanRecs.find(rec => rec.id === id);

    if (!recommendationToUpdate) {
      toast.error('Recommendation not found.');
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
            // No need to manually update local state here, as useOfflineRecommendationStatusMutation does it optimistically
            toast.success('Status updated successfully');
          },
          onError: (error) => {
            console.error('Failed to update status:', error);
            // The mutation hook should handle reverting the optimistic update or marking as failed
            toast.error('Failed to update status');
          }
        }
      );
    } catch (error) {
      console.error('Unhandled error in moveRecommendation:', error);
      toast.error('Failed to update status');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Remove online status indicator */}
          
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
                                      moveRecommendation(task.id, "in_progress")
                                    }
                                  >
                                    {t("user.actionPlan.kanban.moveToInProgress", { defaultValue: "Move to In Progress" })}
                                  </button>
                                )}
                                {isAdmin && task.status === "in_progress" && (
                                  <>
                                    <button
                                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                      onClick={() =>
                                        moveRecommendation(task.id, "todo")
                                      }
                                    >
                                      {t("user.actionPlan.kanban.backToTodo", { defaultValue: "Back to To Do" })}
                                    </button>
                                    <button
                                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                      onClick={() =>
                                        moveRecommendation(task.id, "done")
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
                                        moveRecommendation(task.id, "approved")
                                      }
                                    >
                                      Approve
                                    </button>
                                  </>
                                )}
                                {isAdmin && task.status === "approved" && (
                                  <button
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    onClick={() =>
                                      moveRecommendation(task.id, "done")
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
      </div>
    </div>
  );
};
