/**
 * @file NavigationControls.tsx
 * @description This file defines the navigation controls for the Assessment page.
 */
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface NavigationControlsProps {
  previousCategory: () => void;
  nextCategory: () => void;
  submitAssessment: () => void;
  isCurrentCategoryComplete: () => boolean;
  isLastCategory: boolean;
  currentCategoryIndex: number;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  previousCategory,
  nextCategory,
  submitAssessment,
  isCurrentCategoryComplete,
  isLastCategory,
  currentCategoryIndex,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center">
      <Button
        variant="outline"
        onClick={previousCategory}
        disabled={currentCategoryIndex === 0}
        className="flex items-center space-x-2"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t("previous")}</span>
      </Button>
      <div className="flex space-x-4">
        {isLastCategory ? (
          <Button
            onClick={submitAssessment}
            className="bg-dgrv-green hover:bg-green-700 flex items-center space-x-2"
            disabled={!isCurrentCategoryComplete()}
          >
            <Send className="w-4 h-4" />
            <span>{t("submit")}</span>
          </Button>
        ) : (
          <Button
            onClick={nextCategory}
            className="bg-dgrv-blue hover:bg-blue-700 flex items-center space-x-2"
            disabled={!isCurrentCategoryComplete()}
          >
            <span>{t("next")}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};