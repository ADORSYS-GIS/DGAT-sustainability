/*
 * Sync status indicator component for showing online/offline status
 * Displays connection status and sync information
 */

import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
import React from "react";

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline } = useSyncStatus();

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center space-x-2 px-3 py-1 rounded-full text-sm shadow-lg transition-colors ${
        isOnline
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-500" : "bg-yellow-500"
        }`}
      ></div>
      <span>{isOnline ? "Online" : "Offline"}</span>
    </div>
  );
};
