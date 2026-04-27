import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { apiInterceptor } from "../services/apiInterceptor";
import { syncService } from "../services/syncService";
import { syncQueueService } from "../services/syncQueueService";

export function useOfflineSyncStatus() {
  const [isOnline, setIsOnline] = useState(apiInterceptor.getNetworkStatus());
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(apiInterceptor.getNetworkStatus());
    };

    const updateQueueCount = async () => {
      const queue = await offlineDB.getSyncQueue();
      setQueueCount(queue.length);
    };

    const updateSyncStatus = () => {
      setIsSyncing(syncService.isCurrentlySyncing());
    };

    // Update immediately
    updateStatus();
    updateQueueCount();
    updateSyncStatus();

    // Set up listeners
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('sync-queue-updated', updateQueueCount);

    // Update queue count and sync status periodically as a fallback
    const interval = setInterval(() => {
      updateQueueCount();
      updateSyncStatus();
    }, 10000); // 10 seconds is enough with event listeners

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('sync-queue-updated', updateQueueCount);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, queueCount, isSyncing };
}

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    try {
      setIsSyncing(true);
      // Perform both queue processing and full sync
      await syncQueueService.processQueue();
      await syncService.performFullSync();
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { sync, isSyncing };
}