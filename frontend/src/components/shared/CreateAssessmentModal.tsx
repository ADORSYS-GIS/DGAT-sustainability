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

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [assessmentName, setAssessmentName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentName.trim()) {
      onSubmit(assessmentName.trim());
      setAssessmentName("");
    }
  };

  const handleClose = () => {
    setAssessmentName("");
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
              disabled={isLoading || !assessmentName.trim()}
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