/**
 * @file Error.tsx
 * @description This file defines the Error component for displaying an error message.
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorProps {
  onRetry: () => void;
}

export const Error: React.FC<ErrorProps> = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">
            {t("reviewAssessments.errorLoadingSubmissions", {
              defaultValue: "Error loading submissions",
            })}
          </p>
          <Button onClick={onRetry} className="mt-2">
            {t("reviewAssessments.retry", { defaultValue: "Retry" })}
          </Button>
        </div>
      </div>
    </div>
  );
};