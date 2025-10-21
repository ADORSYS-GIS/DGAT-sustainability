// /frontend/src/components/pages/admin/AdminActionPlans/KanbanBoard.tsx
/**
 * @file Kanban board component for displaying an organization's action plan.
 * @description This component renders the Kanban board with columns for different task statuses.
 */
import { Button } from '@/components/ui/button';
import { OrganizationActionPlan } from '@/openapi-rq/requests/types.gen';
import { AlertCircle, ArrowLeft, CheckCircle, PlayCircle, RefreshCw, ThumbsUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  organization: OrganizationActionPlan;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const columns = [
    { id: "todo", title: "To Do", icon: AlertCircle, color: "text-gray-600" },
    { id: "in_progress", title: "In Progress", icon: PlayCircle, color: "text-blue-600" },
    { id: "done", title: "Done", icon: CheckCircle, color: "text-green-600" },
    { id: "approved", title: "Approved", icon: ThumbsUp, color: "text-emerald-600" },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  organization,
  onBack,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useTranslation();

  const getTasksByStatus = (status: string) =>
    organization.recommendations.filter((rec) => rec.status === status) || [];

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('adminActionPlans.backToOrganizations', { defaultValue: 'Back to Organizations' })}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.organization_name}</h1>
            <p className="text-gray-600">{t('adminActionPlans.actionPlanFor', { defaultValue: 'Action Plan' })}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t('adminActionPlans.refresh', { defaultValue: 'Refresh' })}</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={{
              ...column,
              title: t(`adminActionPlans.kanban.${column.id}`, { defaultValue: column.title }),
            }}
            tasks={getTasksByStatus(column.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;