import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useOfflineAdminActionPlans } from '@/hooks/useOfflineApi';
import {
  OrganizationActionPlan
} from '@/openapi-rq/requests/types.gen';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  PlayCircle,
  RefreshCw,
  ThumbsUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const AdminActionPlans: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationActionPlan | null>(null);
  
  const {
    data: { organizations },
    isLoading,
    error,
    refetch
  } = useOfflineAdminActionPlans();

  // State to manage refreshing indicator
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Effect to handle initial data fetch and re-fetch on language change
  useEffect(() => {
    refetch();
  }, [t, refetch]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Update selected organization if the data changes
  useEffect(() => {
    if (selectedOrganization && organizations.length > 0) {
      const updatedOrg = organizations.find(org => org.organization_id === selectedOrganization.organization_id);
      if (updatedOrg) {
        setSelectedOrganization(updatedOrg);
      } else {
        // If the selected organization no longer exists (e.g., deleted), deselect it
        setSelectedOrganization(null);
      }
    }
  }, [organizations]); // eslint-disable-line react-hooks/exhaustive-deps
  // Disable exhaustive-deps for `selectedOrganization` as we explicitly handle its update based on `organizations`

  // Refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we're not already loading and we have data
      if (!isLoading && !isRefreshing && organizations.length > 0) {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoading, isRefreshing, organizations.length, handleRefresh]);

  // Columns for Kanban
  const columns = [
    { id: "todo", title: t("adminActionPlans.kanban.todo", { defaultValue: "To Do" }), icon: AlertCircle, color: "text-gray-600" },
    {
      id: "in_progress",
      title: t("adminActionPlans.kanban.inProgress", { defaultValue: "In Progress" }),
      icon: PlayCircle,
      color: "text-blue-600",
    },
    { id: "done", title: t("adminActionPlans.kanban.done", { defaultValue: "Done" }), icon: CheckCircle, color: "text-green-600" },
    {
      id: "approved",
      title: t("adminActionPlans.kanban.approved", { defaultValue: "Approved" }),
      icon: ThumbsUp,
      color: "text-emerald-600",
    },
  ];

  // Filter recommendations by status
  const getTasksByStatus = (status: string) =>
    selectedOrganization?.recommendations.filter((rec) => rec.status === status) || [];

  const getStatusBadge = (status: string) => {
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('adminActionPlans.loading', { defaultValue: 'Loading action plans...' })}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error.message}</p>
            <Button onClick={handleRefresh} className="mt-2">
              {t('adminActionPlans.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show organization selection if no organization is selected
  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6 pt-24">
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
            onClick={handleRefresh}
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
            <Card className="col-span-full text-center py-12">
              <CardContent>
                <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('adminActionPlans.noOrganizations', { defaultValue: 'No organizations with action plans' })}
                </h3>
                <p className="text-gray-600">
                  {t('adminActionPlans.noOrganizationsDesc', { defaultValue: 'Organizations with recommendations will appear here' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            organizations.map((org) => (
              <Card
                key={org.organization_id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOrganization(org)}
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
                            <span className={column.color}>{column.title}</span>
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Show selected organization's action plan
  return (
    <div className="container mx-auto p-6 pt-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrganization(null)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('adminActionPlans.backToOrganizations', { defaultValue: 'Back to Organizations' })}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedOrganization.organization_name}</h1>
            <p className="text-gray-600">{t('adminActionPlans.actionPlanFor', { defaultValue: 'Action Plan' })}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{t('adminActionPlans.refresh', { defaultValue: 'Refresh' })}</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          const IconComponent = column.icon;
          return (
            <Card key={column.id} className="animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle
                  className={`flex items-center space-x-2 ${column.color}`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{column.title}</span>
                  <Badge variant="outline" className="ml-auto">
                    {columnTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <column.icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {t("adminActionPlans.kanban.noTasks", { status: column.id, defaultValue: `No tasks in ${column.title.toLowerCase()}` })}
                    </p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <Card
                      key={`${task.report_id}-${task.category}`}
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
                            {getStatusBadge(task.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminActionPlans;
