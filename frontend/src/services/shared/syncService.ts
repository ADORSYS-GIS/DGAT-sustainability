import { dbService, SyncQueueItem } from "./indexedDB";

// Sync queue management
export const addToSyncQueue = async (
  action: string,
  data: unknown,
  userId: string,
): Promise<void> => {
  const queueItem: SyncQueueItem = {
    queueId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    data,
    status: "pending",
    timestamp: new Date().toISOString(),
    userId,
  };

  await dbService.add("sync_queue", queueItem);
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  return await dbService.getAll<SyncQueueItem>("sync_queue");
};

export const updateSyncQueueItem = async (
  queueItem: SyncQueueItem,
): Promise<void> => {
  await dbService.update("sync_queue", queueItem);
};
