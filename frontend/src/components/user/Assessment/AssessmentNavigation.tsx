/*
 * Navigation component for assessment interface
 * Provides previous/next buttons and submit functionality
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AssessmentNavigationProps {
  currentCategoryIndex: number;
  isLastCategory: boolean;
  isCurrentCategoryComplete: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const AssessmentNavigation: React.FC<AssessmentNavigationProps> = ({
  currentCategoryIndex,
  isLastCategory,
  isCurrentCategoryComplete,
  onPrevious,
  onNext,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentCategoryIndex === 0}
        className="flex items-center space-x-2"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t("previous")}</span>
      </Button>
      <div className="flex space-x-4">
        {isLastCategory ? (
          <Button
            onClick={onSubmit}
            className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
            disabled={!isCurrentCategoryComplete}
          >
            <Send className="w-4 h-4" />
            <span>{t("submit")}</span>
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
            disabled={!isCurrentCategoryComplete}
          >
            <span>{t("next")}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
