/*
 * Review status indicators component for assessment review interface
 * Shows sync button, online/offline status, and pending reviews count
 */

import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReviewStatusIndicatorsProps {
  isOnline: boolean;
  pendingReviewsCount: number;
  onManualSync: () => void;
}

export const ReviewStatusIndicators: React.FC<ReviewStatusIndicatorsProps> = ({
  isOnline,
  pendingReviewsCount,
  onManualSync,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center space-x-4 mb-6">
      {/* Manual Sync Button */}
      <Button
        onClick={onManualSync}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <RefreshCw className="w-4 h-4" />
        <span>
          {t("reviewAssessments.syncData", { defaultValue: "Sync Data" })}
        </span>
      </Button>

      {/* Offline/Online Status */}
      <div
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
          isOnline
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>
          {isOnline
            ? t("common.online", { defaultValue: "Online" })
            : t("common.offline", { defaultValue: "Offline" })}
        </span>
      </div>

      {/* Pending Reviews Indicator */}
      {pendingReviewsCount > 0 && (
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
          <Clock className="w-4 h-4" />
          <span>
            {pendingReviewsCount}{" "}
            {t("reviewAssessments.pendingSync", {
              defaultValue: "Pending Sync",
            })}
          </span>
        </div>
      )}
    </div>
  );
};
