import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import React from "react";

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, queueCount, isSyncing } = useOfflineSyncStatus();

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center space-x-2 px-3 py-1 rounded-full text-sm shadow-lg transition-all duration-300 ${isOnline
          ? (isSyncing ? 'bg-blue-100 text-blue-800' : (queueCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'))
          : 'bg-amber-100 text-amber-800'
        }`}
    >
      <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline
          ? (isSyncing ? 'bg-blue-500' : (queueCount > 0 ? 'bg-orange-500' : 'bg-green-500'))
          : 'bg-amber-500'
        }`}></div>
      <span className="font-medium">
        {isOnline
          ? (isSyncing ? 'Syncing...' : (queueCount > 0 ? `${queueCount} Pending` : 'Online'))
          : 'Offline'}
      </span>
    </div>
  );
};