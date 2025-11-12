import { offlineDB } from './indexeddb';
import { apiInterceptor } from './apiInterceptor';
import type { SyncQueueItem } from '@/types/offline';

class SyncQueueService {
  private isProcessing = false;

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // The apiInterceptor already has the logic to process the queue.
      // We just need to call it.
      await apiInterceptor.processQueue();
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncQueueService = new SyncQueueService();