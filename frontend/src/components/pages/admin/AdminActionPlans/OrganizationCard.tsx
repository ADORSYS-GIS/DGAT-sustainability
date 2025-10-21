// /frontend/src/components/pages/admin/AdminActionPlans/OrganizationCard.tsx
/**
 * @file Card component for displaying an organization's action plan summary.
 * @description This component shows the organization's name, total recommendations, and a breakdown by status.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationActionPlan } from '@/openapi-rq/requests/types.gen';
import { AlertCircle, Building2, CheckCircle, PlayCircle, ThumbsUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface OrganizationCardProps {
  org: OrganizationActionPlan;
  onSelect: (org: OrganizationActionPlan) => void;
}

const columns = [
    { id: "todo", title: "To Do", icon: AlertCircle, color: "text-gray-600" },
    { id: "in_progress", title: "In Progress", icon: PlayCircle, color: "text-blue-600" },
    { id: "done", title: "Done", icon: CheckCircle, color: "text-green-600" },
    { id: "approved", title: "Approved", icon: ThumbsUp, color: "text-emerald-600" },
];

const OrganizationCard: React.FC<OrganizationCardProps> = ({ org, onSelect }) => {
  const { t } = useTranslation();

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(org)}
    >
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{org.organization_name}</CardTitle>
            <p className="text-sm text-gray-600">
              {org.recommendations.length} {org.recommendations.length === 1 ? t('adminActionPlans.recommendation', { defaultValue: 'recommendation' }) : t('adminActionPlans.recommendations', { defaultValue: 'recommendations' })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {columns.map((column) => {
            const count = org.recommendations.filter(rec => rec.status === column.id).length;
            if (count === 0) return null;
            
            const IconComponent = column.icon;
            return (
              <div key={column.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-4 h-4" />
                  <span className={column.color}>{t(`adminActionPlans.kanban.${column.id}`, { defaultValue: column.title })}</span>
                </div>
                <Badge variant="outline">{count}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizationCard;