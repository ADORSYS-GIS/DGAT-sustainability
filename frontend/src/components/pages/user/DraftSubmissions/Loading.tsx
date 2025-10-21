/**
 * @file Loading.tsx
 * @description This file defines the loading component for the Draft Submissions page.
 */
import { Button } from "@/components/ui/button";
import React from "react";
import { useTranslation } from "react-i18next";

interface LoadingProps {
  error?: Error | null;
  refetch?: () => void;
}

export const Loading: React.FC<LoadingProps> = ({ error, refetch }) => {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-lg text-red-600 mb-2">
                {t("user.draftSubmissions.errorLoadingDraftSubmissions", {
                  defaultValue: "Error loading draft submissions",
                })}
              </div>
              {refetch && (
                <Button onClick={refetch} variant="outline">
                  {t("user.draftSubmissions.tryAgain", {
                    defaultValue: "Try Again",
                  })}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">
              {t("user.draftSubmissions.loadingDraftSubmissions", {
                defaultValue: "Loading draft submissions...",
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};