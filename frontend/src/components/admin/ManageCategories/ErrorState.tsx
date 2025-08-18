/*
 * Error state component for category management page
 * Displays error message with retry functionality when data loading fails
 */

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  error: Error | null;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-20 pb-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            {t("manageCategories.loadError", {
              defaultValue: "Error Loading Categories",
            })}
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : t("manageCategories.unknownError", {
                  defaultValue: "An unknown error occurred",
                })}
          </p>
          <Button onClick={onRetry} className="bg-dgrv-blue hover:bg-blue-700">
            {t("manageCategories.retry", { defaultValue: "Retry" })}
          </Button>
        </div>
      </div>
    </div>
  );
};
