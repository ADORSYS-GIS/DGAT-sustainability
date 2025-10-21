import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOfflineOrganizationCategories } from "@/hooks/useOfflineOrganizationCategories";
import { LoadingSpinner } from "./LoadingSpinner";
import { OfflineCategoryCatalog, OfflineOrganizationCategory } from "@/types/offline";
import { offlineDB } from "@/services/indexeddb";

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, categories?: string[]) => void;
  isLoading?: boolean;
  isOrgAdmin?: boolean;
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  isOrgAdmin = false,
}) => {
  const { t } = useTranslation();
  const [assessmentName, setAssessmentName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const {
    organizationCategories: availableOrganizationCategories = [],
    isLoading: isLoadingCategories,
    error: orgCategoriesError,
  } = useOfflineOrganizationCategories();

  const [availableCategories, setAvailableCategories] = useState<OfflineCategoryCatalog[]>([]);

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      if (availableOrganizationCategories.length > 0) {
        const categoryCatalogIds = availableOrganizationCategories.map(oc => oc.category_catalog_id);
        const categories = await Promise.all(
          categoryCatalogIds.map(id => offlineDB.getCategoryCatalog(id))
        );
        setAvailableCategories(categories.filter((cat): cat is OfflineCategoryCatalog => cat !== undefined));
      } else {
        setAvailableCategories([]);
      }
    };
    fetchCategoryDetails();
  }, [availableOrganizationCategories]);

  useEffect(() => {
    if (orgCategoriesError) {
      toast.error(t('assessment.errors.fetchCategories', {
        defaultValue: 'Failed to fetch categories. Please try again later.'
      }));
    }
  }, [orgCategoriesError, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentName.trim()) {
      if (isOrgAdmin && selectedCategories.length === 0) {
        toast.error(t('assessment.categoriesRequired', { defaultValue: 'Please select at least one category for this assessment.' }));
        return;
      }
      
      const categoriesToSubmit = isOrgAdmin && selectedCategories.length > 0 ? selectedCategories : undefined;
      onSubmit(assessmentName.trim(), categoriesToSubmit);
      setAssessmentName("");
      setSelectedCategories([]);
    }
  };

  const handleClose = () => {
    setAssessmentName("");
    setSelectedCategories([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t('assessment.createAssessment', { defaultValue: 'Create Assessment' })}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assessment-name">
              {t('assessment.assessmentName', { defaultValue: 'Assessment Name' })}
            </Label>
            <Input
              id="assessment-name"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder={t('assessment.enterAssessmentName', { defaultValue: 'Enter assessment name...' })}
              required
              autoFocus
            />
          </div>
          
          {isOrgAdmin && (
            <div>
              <Label htmlFor="assessment-categories">
                {t('assessment.selectCategories', { defaultValue: 'Select Categories' })}
                {availableCategories.length > 0 && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {isLoadingCategories ? (
                <div className="flex justify-center items-center h-24">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {availableCategories.length > 0 ? (
                    availableCategories.map((category: OfflineCategoryCatalog) => (
                      <div key={category.category_catalog_id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category.category_catalog_id}`}
                          checked={selectedCategories.includes(category.category_catalog_id)}
                          onChange={(e) => {
                            const categoryId = category.category_catalog_id;
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, categoryId]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== categoryId));
                            }
                          }}
                          className="h-4 w-4 text-dgrv-blue focus:ring-dgrv-blue border-gray-300 rounded"
                        />
                        <label htmlFor={`category-${category.category_catalog_id}`} className="text-sm text-gray-700">
                          {category.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center p-4">
                      {t('assessment.noCategoriesFound', { defaultValue: 'No categories found for your organization.' })}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {t('assessment.categoriesHint', { defaultValue: 'Select categories to include in this assessment. At least one category is required.' })}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              className="bg-dgrv-blue hover:bg-blue-700"
              disabled={isLoading || !assessmentName.trim() || (isOrgAdmin && selectedCategories.length === 0)}
            >
              {isLoading
                ? t('common.creating', { defaultValue: 'Creating...' })
                : t('assessment.createAssessment', { defaultValue: 'Create Assessment' })
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};