/**
 * @file AssessmentHeader.tsx
 * @description This file defines the header component for the Assessment page.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import React from "react";
import { useTranslation } from "react-i18next";

interface AssessmentHeaderProps {
  toolName: string;
  currentCategoryIndex: number;
  categories: string[];
  currentCategoryName: string;
  progress: number;
}

export const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({
  toolName,
  currentCategoryIndex,
  categories,
  currentCategoryName,
  progress,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-dgrv-blue mb-2">{toolName}</h1>
        <p className="text-lg text-gray-600">
          {t("category")} {currentCategoryIndex + 1}{" "}
          {t("of", { defaultValue: "of" })} {categories.length}:{" "}
          {currentCategoryName}
        </p>
      </div>
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t("progress")}
            </span>
            <span className="text-sm font-medium text-dgrv-blue">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>
    </>
  );
};