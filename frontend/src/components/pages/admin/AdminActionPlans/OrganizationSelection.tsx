// /frontend/src/components/pages/admin/AdminActionPlans/OrganizationSelection.tsx
/**
 * @file Component for selecting an organization to view its action plan.
 * @description This component displays a list of organizations and allows the user to select one.
 */
import { Button } from '@/components/ui/button';
import { OrganizationActionPlan } from '@/openapi-rq/requests/types.gen';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import NoOrganizations from './NoOrganizations';
import OrganizationCard from './OrganizationCard';

interface OrganizationSelectionProps {
  organizations: OrganizationActionPlan[];
  onSelectOrganization: (org: OrganizationActionPlan) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const OrganizationSelection: React.FC<OrganizationSelectionProps> = ({
  organizations,
  onSelectOrganization,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/review-assessments')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('adminActionPlans.backToReview', { defaultValue: 'Back to Review' })}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminActionPlans.title', { defaultValue: 'Organization Action Plans' })}</h1>
            <p className="text-gray-600">{t('adminActionPlans.subtitle', { defaultValue: 'Select an organization to view their action plan' })}</p>
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

      {/* Organization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.length === 0 ? (
          <NoOrganizations />
        ) : (
          organizations.map((org) => (
            <OrganizationCard
              key={org.organization_id}
              org={org}
              onSelect={onSelectOrganization}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default OrganizationSelection;