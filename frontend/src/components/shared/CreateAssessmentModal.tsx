import * as React from "react";
import { useState } from "react";
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

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, categories?: string[]) => void;
  isLoading?: boolean;
  isOrgAdmin?: boolean;
  availableCategories?: string[];
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  isOrgAdmin = false,
  availableCategories = [],
}) => {
  const { t } = useTranslation();
  const [assessmentName, setAssessmentName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentName.trim()) {
      // For org_admins, categories are required. For others, they're optional.
      if (isOrgAdmin && availableCategories.length > 0 && selectedCategories.length === 0) {
        toast.error(t('assessment.categoriesRequired', { defaultValue: 'Please select at least one category for this assessment.' }));
        return;
      }
      
      // Only pass categories if user is org_admin and categories are selected
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
          
          {/* Category selection (only for org_admins) */}
          {isOrgAdmin && availableCategories.length > 0 && (
            <div>
              <Label htmlFor="assessment-categories">
                {t('assessment.selectCategories', { defaultValue: 'Select Categories' })}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== category));
                        }
                      }}
                      className="h-4 w-4 text-dgrv-blue focus:ring-dgrv-blue border-gray-300 rounded"
                    />
                    <label htmlFor={`category-${category}`} className="text-sm text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
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
              disabled={isLoading || !assessmentName.trim() || (isOrgAdmin && availableCategories.length > 0 && selectedCategories.length === 0)}
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