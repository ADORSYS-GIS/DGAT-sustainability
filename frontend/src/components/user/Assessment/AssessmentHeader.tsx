/*
 * Header component for assessment taking interface
 * Displays tool name, current category, and progress indicator
 */

import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface AssessmentHeaderProps {
  toolName: string;
  currentCategoryIndex: number;
  categoriesLength: number;
  currentCategory: string;
  progress: number;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  toolName,
  currentCategoryIndex,
  categoriesLength,
  currentCategory,
  progress,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-dgrv-blue mb-2">{toolName}</h1>
        <p className="text-lg text-gray-600">
          {t("category")} {currentCategoryIndex + 1}{" "}
          {t("of", { defaultValue: "of" })} {categoriesLength}:{" "}
          {currentCategory}
        </p>
      </div>

      <div className="mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t("progress")}
            </span>
            <span className="text-sm font-medium text-dgrv-blue">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </div>
    </>
  );
};
