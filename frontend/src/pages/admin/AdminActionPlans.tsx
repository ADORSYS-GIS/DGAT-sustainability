// /frontend/src/pages/admin/AdminActionPlans.tsx
/**
 * @file Admin Action Plans page.
 * @description This page allows administrators to view and manage action plans for all organizations.
 */
import ErrorDisplay from '@/components/pages/admin/AdminActionPlans/ErrorDisplay';
import KanbanBoard from '@/components/pages/admin/AdminActionPlans/KanbanBoard';
import LoadingIndicator from '@/components/pages/admin/AdminActionPlans/LoadingIndicator';
import OrganizationSelection from '@/components/pages/admin/AdminActionPlans/OrganizationSelection';
import { useOfflineAdminActionPlans } from '@/hooks/useOfflineReports';
import { OrganizationActionPlan } from '@/openapi-rq/requests/types.gen';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AdminActionPlans: React.FC = () => {
  const { t } = useTranslation();
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationActionPlan | null>(null);
  
  const {
    data: { organizations },
    isLoading,
    error,
    refetch
  } = useOfflineAdminActionPlans();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (selectedOrganization && organizations.length > 0) {
      const updatedOrg = organizations.find(org => org.organization_id === selectedOrganization.organization_id);
      if (updatedOrg) {
        setSelectedOrganization(updatedOrg);
      } else {
        setSelectedOrganization(null);
      }
    }
  }, [organizations, selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization && organizations.length > 0) {
      setSelectedOrganization(organizations[0]);
    }
  }, [organizations, selectedOrganization]);

  useEffect(() => {
    const handleFocus = () => {
      if (!isLoading && !isRefreshing && organizations.length > 0) {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoading, isRefreshing, organizations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRefresh} />;
  }

  if (!selectedOrganization) {
    return (
      <OrganizationSelection
        organizations={organizations}
        onSelectOrganization={setSelectedOrganization}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <KanbanBoard
      organization={selectedOrganization}
      onBack={() => setSelectedOrganization(null)}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
};

export default AdminActionPlans;
