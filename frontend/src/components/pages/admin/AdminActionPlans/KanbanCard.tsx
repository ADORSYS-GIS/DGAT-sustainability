// /frontend/src/components/pages/admin/AdminActionPlans/KanbanCard.tsx
/**
 * @file Card component for displaying a single task in the Kanban board.
 * @description This component shows the task's category, recommendation, creation date, and status.
 */
import { Card, CardContent } from '@/components/ui/card';
import { RecommendationWithStatus } from '@/openapi-rq/requests/types.gen';
import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';

interface KanbanCardProps {
  task: RecommendationWithStatus;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task }) => {
  const { t } = useTranslation();

  return (
    <Card
      className="bg-gray-50 border-gray-200"
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-blue-600 mb-1">
            {task.category}
          </div>
          <div className="text-sm text-gray-900 mb-2">
            {task.recommendation}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('adminActionPlans.createdAt', { defaultValue: 'Created' })}: {new Date(task.created_at).toLocaleDateString()}</span>
            <StatusBadge status={task.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KanbanCard;