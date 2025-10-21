// /frontend/src/components/pages/admin/AdminActionPlans/StatusBadge.tsx
/**
 * @file Status badge component for recommendations.
 * @description This component displays a styled badge based on the recommendation status.
 */
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, PlayCircle, ThumbsUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();

  switch (status) {
    case 'todo':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />{t('adminActionPlans.todo', { defaultValue: 'To Do' })}</Badge>;
    case 'in_progress':
      return <Badge variant="default" className="bg-blue-100 text-blue-800"><PlayCircle className="w-3 h-3 mr-1" />{t('adminActionPlans.inProgress', { defaultValue: 'In Progress' })}</Badge>;
    case 'done':
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('adminActionPlans.done', { defaultValue: 'Done' })}</Badge>;
    case 'approved':
      return <Badge variant="default" className="bg-emerald-100 text-emerald-800"><ThumbsUp className="w-3 h-3 mr-1" />{t('adminActionPlans.approved', { defaultValue: 'Approved' })}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default StatusBadge;