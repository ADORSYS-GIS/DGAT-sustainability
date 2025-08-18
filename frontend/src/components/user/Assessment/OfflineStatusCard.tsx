/*
 * Offline status card component for assessment interface
 * Shows connection status and pending submission information
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { OfflineSubmission } from "@/types/offline";

interface OfflineStatusCardProps {
  isOnline: boolean;
  pendingSubmissions: OfflineSubmission[];
}

export const OfflineStatusCard: React.FC<OfflineStatusCardProps> = ({
  isOnline,
  pendingSubmissions,
}) => {
  const { t } = useTranslation();

  if (!isOnline) {
    return (
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-orange-800">
                {t("assessment.offlineMode", {
                  defaultValue:
                    "You are offline. Your responses will be saved locally and synced when you come back online.",
                })}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  window.dispatchEvent(new Event("online"));
                } catch (error) {
                  // Error handling
                }
              }}
              className="text-xs"
            >
              Sync Now
            </Button>
          </div>
          {pendingSubmissions.length > 0 && (
            <div className="mt-2 text-xs text-orange-700">
              {t("assessment.pendingSubmissions", {
                defaultValue: "Pending submissions:",
              })}{" "}
              {pendingSubmissions.length}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isOnline && pendingSubmissions.length > 0) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                {t("assessment.onlineWithPending", {
                  defaultValue:
                    "You are online. Syncing pending submissions...",
                })}
              </span>
            </div>
            <div className="text-xs text-green-700">
              {t("assessment.pendingSubmissions", {
                defaultValue: "Pending submissions:",
              })}{" "}
              {pendingSubmissions.length}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
