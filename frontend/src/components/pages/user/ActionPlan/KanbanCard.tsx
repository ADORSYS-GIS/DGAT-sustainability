/**
 * @file KanbanCard.tsx
 * @description This file defines the Kanban card component for the Action Plan page.
 */
import { Card, CardContent } from "@/components/ui/card";
import { OfflineRecommendation } from "@/types/offline";
import React from "react";
import { useTranslation } from "react-i18next";
import { getStatusColor } from "./utils";

type KanbanRecommendation = OfflineRecommendation & {
  id: string;
  assessment_name?: string;
};

interface KanbanCardProps {
  task: KanbanRecommendation;
  isAdmin: boolean;
  moveRecommendation: (
    id: string,
    newStatus: "todo" | "in_progress" | "done" | "approved"
  ) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  isAdmin,
  moveRecommendation,
}) => {
  const { t } = useTranslation();

  return (
    <Card key={task.id} className={getStatusColor(task.status)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-dgrv-blue mb-1">{task.category}</div>
          <div className="text-sm text-gray-700 italic mb-1">
            {task.assessment_name}
          </div>
          <div className="text-sm text-gray-900 mb-2">
            {task.recommendation}
          </div>
          <div className="flex gap-2 mt-2">
            {isAdmin && task.status === "todo" && (
              <button
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                onClick={() => moveRecommendation(task.id, "in_progress")}
              >
                {t("user.actionPlan.kanban.moveToInProgress", {
                  defaultValue: "Move to In Progress",
                })}
              </button>
            )}
            {isAdmin && task.status === "in_progress" && (
              <>
                <button
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  onClick={() => moveRecommendation(task.id, "todo")}
                >
                  {t("user.actionPlan.kanban.backToTodo", {
                    defaultValue: "Back to To Do",
                  })}
                </button>
                <button
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  onClick={() => moveRecommendation(task.id, "done")}
                >
                  {t("user.actionPlan.kanban.moveToDone", {
                    defaultValue: "Move to Done",
                  })}
                </button>
              </>
            )}
            {isAdmin && task.status === "done" && (
              <>
                <button
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  onClick={() => moveRecommendation(task.id, "in_progress")}
                >
                  {t("user.actionPlan.kanban.backToInProgress", {
                    defaultValue: "Back to In Progress",
                  })}
                </button>
                <button
                  className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                  onClick={() => moveRecommendation(task.id, "approved")}
                >
                  Approve
                </button>
              </>
            )}
            {isAdmin && task.status === "approved" && (
              <button
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                onClick={() => moveRecommendation(task.id, "done")}
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
  );
};