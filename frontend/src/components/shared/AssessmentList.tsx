import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, FileText, Tag } from "lucide-react";
import type { OfflineAssessment, OfflineCategory } from "@/types/offline";
import { useOfflineCategories } from "@/hooks/useOfflineApi";

interface AssessmentListProps {
  assessments: OfflineAssessment[];
  onSelectAssessment: (assessmentId: string) => void;
  isLoading?: boolean;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  onSelectAssessment,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { data: categoriesData } = useOfflineCategories();

  // Create a map of category IDs to category names for easy lookup
  const categoriesMap = React.useMemo(() => {
    if (!categoriesData?.categories) return new Map<string, string>();
    return new Map(
      categoriesData.categories.map((cat) => [cat.category_id, cat.name])
    );
  }, [categoriesData?.categories]);

  // Function to get category names from category UUIDs
  const getCategoryNames = (categoryIds?: string[]) => {
    if (!categoryIds || categoryIds.length === 0) return [];
    return categoryIds
      .map((id) => categoriesMap.get(id))
      .filter((name): name is string => !!name);
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
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}; 