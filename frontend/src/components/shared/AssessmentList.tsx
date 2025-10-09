import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, FileText, Tag, Trash2 } from "lucide-react";
import type { OfflineAssessment } from "@/types/offline";
import { useOfflineCategoryCatalogs } from "@/hooks/useCategoryCatalogs";
import { useOfflineAssessmentsMutation } from "@/hooks/useOfflineApi";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";

interface AssessmentListProps {
  assessments: OfflineAssessment[];
  onSelectAssessment: (assessmentId: string) => void;
  isLoading?: boolean;
  onAssessmentDeleted?: () => void;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  onSelectAssessment,
  isLoading = false,
  onAssessmentDeleted,
}) => {
  const { t } = useTranslation();
  const { data: categoriesData } = useOfflineCategoryCatalogs();
  const { deleteAssessment, isPending } = useOfflineAssessmentsMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = React.useState<string | null>(null);

  // Create a map of category IDs to category names for easy lookup
  const categoriesMap = React.useMemo(() => {
    if (!categoriesData) return new Map<string, string>();
    return new Map(
      categoriesData.map((cat) => [cat.category_catalog_id, cat.name])
    );
  }, [categoriesData]);

  // Function to get category names from category UUIDs
  const getCategoryNames = (categoryIds?: string[]) => {
    if (!categoryIds || categoryIds.length === 0) return [];
    return categoryIds
      .map((id) => categoriesMap.get(id))
      .filter((name): name is string => !!name);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      await deleteAssessment(assessmentId, {
        onSuccess: () => {
          toast.success(t('assessment.deletedSuccessfully', { defaultValue: 'Assessment deleted successfully' }));
          onAssessmentDeleted?.();
        },
        onError: (error) => {
          toast.error(t('assessment.deleteFailed', { defaultValue: 'Failed to delete assessment' }) + ': ' + error.message);
        }
      });
    } catch (error) {
      console.error('❌ Failed to delete assessment:', error);
    } finally {
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const confirmDelete = (assessmentId: string) => {
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dgrv-blue"></div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('assessment.noDraftAssessmentsAvailable', { defaultValue: 'No draft assessments available' })}
        </h3>
        <p className="text-gray-600">
          {t('assessment.noDraftAssessmentsDescription', { defaultValue: 'No draft assessments have been created yet.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment) => (
        <Card key={assessment.assessment_id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-dgrv-blue" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold">
                    {assessment.name || t('assessment.untitled', { defaultValue: 'Untitled Assessment' })}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(assessment.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Display assigned categories */}
                  {assessment.categories && assessment.categories.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Tag className="w-3 h-3" />
                        <span>{t('assessment.assignedCategories', { defaultValue: 'Assigned categories' })}:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getCategoryNames(assessment.categories).map((categoryName) => (
                          <Badge
                            key={categoryName}
                            variant="outline"
                            className="text-xs bg-dgrv-green/10 text-dgrv-green border-dgrv-green/20"
                          >
                            {categoryName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {t('assessment.status.draft', { defaultValue: 'Draft' })}
                </Badge>
                <Button
                  onClick={() => onSelectAssessment(assessment.assessment_id)}
                  className="bg-dgrv-blue hover:bg-blue-700"
                >
                  {t('assessment.continueAssessment', { defaultValue: 'Continue' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmDelete(assessment.assessment_id)}
                  disabled={isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('assessment.delete', { defaultValue: 'Delete' })}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
      
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setAssessmentToDelete(null);
        }}
        onConfirm={() => {
          if (assessmentToDelete) {
            handleDeleteAssessment(assessmentToDelete);
          }
        }}
        title={t('assessment.confirmDeleteTitle', { defaultValue: 'Delete Assessment' })}
        description={t('assessment.confirmDeleteDescription', { defaultValue: 'Are you sure you want to delete this draft assessment? This action cannot be undone.' })}
        confirmText={t('assessment.confirmDelete', { defaultValue: 'Delete' })}
        cancelText={t('assessment.cancel', { defaultValue: 'Cancel' })}
        variant="destructive"
      />
    </div>
  );
};