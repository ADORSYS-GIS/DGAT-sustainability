/*
 * Header component for the manage questions page
 * Displays title and description for question management interface
 */

import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export const QuestionHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-4">
        <BookOpen className="w-8 h-8 text-dgrv-blue" />
        <h1 className="text-3xl font-bold text-dgrv-blue">
          {t("manageQuestions.title", { defaultValue: "Manage Questions" })}
        </h1>
      </div>
      <p className="text-lg text-gray-600">
        {t("manageQuestions.subtitle", {
          defaultValue:
            "Create and manage questions for sustainability assessments",
        })}
      </p>
    </div>
  );
};
