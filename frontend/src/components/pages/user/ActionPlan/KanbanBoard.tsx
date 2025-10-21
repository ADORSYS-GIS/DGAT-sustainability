/**
 * @file KanbanBoard.tsx
 * @description This file defines the Kanban board component for the Action Plan page.
 */
import { OfflineRecommendation } from "@/types/offline";
import { AlertCircle, CheckCircle, PlayCircle, ThumbsUp } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { KanbanColumn } from "./KanbanColumn";

type KanbanRecommendation = OfflineRecommendation & {
  id: string;
  assessment_name?: string;
};

interface KanbanBoardProps {
  recommendations: KanbanRecommendation[];
  isAdmin: boolean;
  moveRecommendation: (
    id: string,
    newStatus: "todo" | "in_progress" | "done" | "approved"
  ) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  recommendations,
  isAdmin,
  moveRecommendation,
}) => {
  const { t } = useTranslation();

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

  const getTasksByStatus = (status: string) =>
    recommendations.filter((rec) => rec.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={getTasksByStatus(column.id)}
          isAdmin={isAdmin}
          moveRecommendation={moveRecommendation}
        />
      ))}
    </div>
  );
};