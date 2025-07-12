import { Navbar } from "@/components/shared/Navbar";
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
import React from "react";
import { useParams } from "react-router-dom";
import { useReportsServiceGetReportsByReportId } from "../../openapi-rq/queries/queries";
import type { ReportTask } from "@/types/actionPlan";

export const ActionPlan: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const fallbackReportId = "demo-report-id";
  const { data, isLoading } = useReportsServiceGetReportsByReportId({
    reportId: reportId || fallbackReportId,
  });

  const tasks: ReportTask[] =
    (data?.report?.data &&
    typeof data.report.data === "object" &&
    Array.isArray((data.report.data as { tasks?: unknown }).tasks)
      ? (data.report.data as { tasks: ReportTask[] }).tasks
      : []) ?? [];

  const columns = [
    { id: "todo", title: "To Do", icon: AlertCircle, color: "text-gray-600" },
    {
      id: "in_progress",
      title: "In Progress",
      icon: PlayCircle,
      color: "text-blue-600",
    },
    { id: "done", title: "Done", icon: CheckCircle, color: "text-green-600" },
    {
      id: "approved",
      title: "Approved",
      icon: ThumbsUp,
      color: "text-emerald-600",
    },
  ];

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => (task.status || "todo") === status);

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
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Kanban className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    Action Plan
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  Track your sustainability improvement tasks
                </p>
              </div>
            </div>
          </div>

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
                    {columnTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={`${getStatusColor(task.status || "todo")}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">
                              {task.title}
                            </h4>
                            {getStatusIcon(task.status || "todo")}
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-3">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          No tasks in {column.title.toLowerCase()}
                        </p>
                      </div>
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

