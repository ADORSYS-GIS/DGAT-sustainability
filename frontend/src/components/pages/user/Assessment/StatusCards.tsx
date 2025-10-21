/**
 * @file StatusCards.tsx
 * @description This file defines the status card components for the Assessment page.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfflineSubmission } from "@/types/offline";
import React from "react";
import { useTranslation } from "react-i18next";

interface StatusCardsProps {
  isOnline: boolean;
  pendingSubmissions: OfflineSubmission[];
  hasExistingResponses: boolean;
}

export const StatusCards: React.FC<StatusCardsProps> = ({
  isOnline,
  pendingSubmissions,
  hasExistingResponses,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {!isOnline && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-orange-800">
                  {t(
                    "assessment.offlineMode",
                    "You are offline. Your responses will be saved locally and synced when you come back online."
                  )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    window.dispatchEvent(new Event("online"));
                  } catch (error) {
                    //
                  }
                }}
                className="text-xs"
              >
                Sync Now
              </Button>
            </div>
            {pendingSubmissions.length > 0 && (
              <div className="mt-2 text-xs text-orange-700">
                {t("assessment.pendingSubmissions", "Pending submissions:")}{" "}
                {pendingSubmissions.length}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasExistingResponses && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                {t(
                  "assessment.existingResponses",
                  "You have existing responses for this assessment. You can continue editing or resubmit your answers."
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnline && pendingSubmissions.length > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">
                  {t(
                    "assessment.onlineWithPending",
                    "You are online. Syncing pending submissions..."
                  )}
                </span>
              </div>
              <div className="text-xs text-green-700">
                {t("assessment.pendingSubmissions", "Pending submissions:")}{" "}
                {pendingSubmissions.length}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};