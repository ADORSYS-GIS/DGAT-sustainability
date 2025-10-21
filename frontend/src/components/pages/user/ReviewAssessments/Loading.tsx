/**
 * @file Loading.tsx
 * @description This file defines the Loading component for displaying a loading indicator.
 */
import { useTranslation } from "react-i18next";

export const Loading: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {t("reviewAssessments.loadingSubmissions", {
              defaultValue: "Loading submissions...",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};