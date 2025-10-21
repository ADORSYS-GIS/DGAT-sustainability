/**
 * @file KanbanColumn.tsx
 * @description This file defines the Kanban column component for the Action Plan page.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfflineRecommendation } from "@/types/offline";
import { LucideIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { KanbanCard } from "./KanbanCard";

type KanbanRecommendation = OfflineRecommendation & {
  id: string;
  assessment_name?: string;
};

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
  };
  tasks: KanbanRecommendation[];
  isAdmin: boolean;
  moveRecommendation: (
    id: string,
    newStatus: "todo" | "in_progress" | "done" | "approved"
  ) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  isAdmin,
  moveRecommendation,
}) => {
  const { t } = useTranslation();
  const IconComponent = column.icon;

  return (
    <Card key={column.id} className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center space-x-2 ${column.color}`}>
          <IconComponent className="w-5 h-5" />
          <span>{column.title}</span>
          <Badge variant="outline" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
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
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              moveRecommendation={moveRecommendation}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};