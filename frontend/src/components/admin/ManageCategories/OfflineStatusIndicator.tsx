/*
 * Offline status indicator component for category management
 * Shows current connection status with visual indicators
 */

interface OfflineStatusIndicatorProps {
  isOnline: boolean;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  isOnline,
}) => {
  return (
    <div className="mb-4 flex items-center justify-end">
      <div
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
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
    </div>
  );
};
