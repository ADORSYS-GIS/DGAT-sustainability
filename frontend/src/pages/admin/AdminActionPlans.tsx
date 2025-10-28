import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useOfflineActionPlans } from '@/hooks/useOfflineActionPlans';
import { OfflineActionPlan, OfflineRecommendation } from '@/types/offline';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  PlayCircle,
  RefreshCw,
  ThumbsUp
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AdminActionPlans: React.FC = () => {
  const { t } = useTranslation();
  const [selectedOrganization, setSelectedOrganization] = useState<OfflineActionPlan | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<{ assessment_id: string; assessment_name: string; created_at: string } | null>(null);

  const {
    data: actionPlansData,
    isLoading: actionPlansLoading,
    error: actionPlansError,
    refetch: refetchActionPlans,
  } = useOfflineActionPlans();

  const uniqueAssessments = useMemo(() => {
    if (!selectedOrganization) return [];
    const assessmentsMap = new Map<string, { assessment_id: string; assessment_name: string; created_at: string }>();
    selectedOrganization.recommendations.forEach(rec => {
        if (rec.assessment_id && !assessmentsMap.has(rec.assessment_id)) {
            assessmentsMap.set(rec.assessment_id, {
                assessment_id: rec.assessment_id,
                assessment_name: rec.assessment_name || 'Unknown Assessment',
                created_at: rec.created_at
            });
        }
    });
    return Array.from(assessmentsMap.values());
  }, [selectedOrganization]);

  // State to manage refreshing indicator
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchActionPlans();
    setIsRefreshing(false);
  };

  // Refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      if (!actionPlansLoading && !isRefreshing) {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [actionPlansLoading, isRefreshing, handleRefresh]);

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
  const getTasksByStatus = (status: string) => {
    if (!selectedAssessment || !selectedOrganization) {
      return [];
    }
    const submissionRecommendations = selectedOrganization.recommendations.filter(
      (rec) => rec.assessment_id === selectedAssessment.assessment_id
    );
    return submissionRecommendations.filter((rec) => rec.status === status);
  };

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

  if (actionPlansLoading) {
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

  if (actionPlansError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{actionPlansError.message}</p>
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
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminActionPlans.title', { defaultValue: 'Organization Action Plans' })}</h1>
            <p className="text-gray-600">{t('adminActionPlans.subtitle', { defaultValue: 'Select an organization to view their action plan' })}</p>
          </div>
        </div>

        {/* Organization Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actionPlansData?.map((org) => (
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
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedAssessment) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedOrganization(null)}
          className="flex items-center space-x-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('adminActionPlans.backToOrganizations', { defaultValue: 'Back to Organizations' })}</span>
        </Button>
        <h1 className="text-3xl font-bold text-dgrv-blue mb-4">
          {t('assessment.selectAssessmentToViewActionPlan', { defaultValue: 'Select Assessment to View Action Plan' })}
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          {t('assessment.selectAssessmentToActionPlanDescription', { defaultValue: 'Choose an assessment to view the action plan.' })}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueAssessments.map((assessment) => (
            <Card
              key={assessment.assessment_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAssessment(assessment)}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-dgrv-blue mb-2">{assessment.assessment_name}</h3>
                <p className="text-sm text-gray-600">
                  {t('assessment.submittedOn', { defaultValue: 'Submitted on' })}: {new Date(assessment.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show selected organization's action plan
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAssessment(null)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('adminActionPlans.backToAssessments', { defaultValue: 'Back to Assessments' })}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedOrganization.organization_name}</h1>
            <p className="text-gray-600">{selectedAssessment.assessment_name}</p>
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
      {actionPlansLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-dgrv-blue"></div>
        </div>
      ) : actionPlansError ? (
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">{t("error.title", { defaultValue: "An Error Occurred" })}</h2>
          <p className="text-gray-600">{actionPlansError.message}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      key={task.recommendation_id}
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
      )}
    </div>
  );
};

export default AdminActionPlans;
