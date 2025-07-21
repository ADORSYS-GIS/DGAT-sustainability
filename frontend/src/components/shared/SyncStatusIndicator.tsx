import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
import { Wifi, WifiOff } from "lucide-react";
import React from "react";

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline } = useSyncStatus();

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center space-x-2 rounded-full px-4 py-2 text-white shadow-lg transition-colors ${
        isOnline ? "bg-green-500" : "bg-red-500"
      }`}
    >
      {isOnline ? (
        <Wifi className="h-5 w-5" />
      ) : (
        <WifiOff className="h-5 w-5" />
      )}
      <span className="font-semibold">{isOnline ? "Online" : "Offline"}</span>
    </div>
  );
}; 