// /frontend/src/components/pages/admin/AdminActionPlans/KanbanColumn.tsx
/**
 * @file Column component for the Kanban board.
 * @description This component displays a single column with its title, icon, and a list of tasks.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecommendationWithStatus } from '@/openapi-rq/requests/types.gen';
import { LucideIcon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
  };
  tasks: RecommendationWithStatus[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks }) => {
  const { t } = useTranslation();
  const IconComponent = column.icon;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle
          className={`flex items-center space-x-2 ${column.color}`}
        >
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
              {t("adminActionPlans.kanban.noTasks", { status: column.id, defaultValue: `No tasks in ${column.title.toLowerCase()}` })}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={`${task.report_id}-${task.category}`}
              task={task}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default KanbanColumn;