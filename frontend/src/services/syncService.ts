import { offlineDB } from './indexeddb';
import { OpenAPI } from '../openapi-rq/requests/core/OpenAPI';

interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: string[];
}

interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  data?: any;
}

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners({ type: 'online', timestamp: Date.now() });
      this.performSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners({ type: 'offline', timestamp: Date.now() });
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC') {
          this.performSync();
        }
      });
    }
  }

  // Initialize the sync service
  async init(): Promise<void> {
    await offlineDB.init();

    // Perform initial sync if online
    if (this.isOnline) {
      await this.performInitialSync();
    }
  }

  // Add sync status listener
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  // Remove sync status listener
  removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  // Notify all listeners of sync status changes
  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status));
  }

  // Perform initial sync to populate local database
  async performInitialSync(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, synced: 0, conflicts: 0, errors: ['Sync already in progress or offline'] };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync_start', timestamp: Date.now() });

    try {
      const result = await this.syncAllData();

      await offlineDB.setMetadata('last_sync_timestamp', new Date().toISOString());

      this.notifyListeners({ 
        type: 'sync_complete', 
        timestamp: Date.now(), 
        result 
      });

      return result;
    } catch (error) {
      console.error('Initial sync failed:', error);
      this.notifyListeners({ 
        type: 'sync_error', 
        timestamp: Date.now(), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return { success: false, synced: 0, conflicts: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Perform regular sync
  async performSync(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, synced: 0, conflicts: 0, errors: ['Sync already in progress or offline'] };
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync_start', timestamp: Date.now() });

    try {
      // First, push local changes to server
      const pushResult = await this.pushLocalChanges();

      // Then, pull remote changes
      const pullResult = await this.pullRemoteChanges();

      const result: SyncResult = {
        success: pushResult.success && pullResult.success,
        synced: pushResult.synced + pullResult.synced,
        conflicts: pushResult.conflicts + pullResult.conflicts,
        errors: [...pushResult.errors, ...pullResult.errors]
      };

      await offlineDB.setMetadata('last_sync_timestamp', new Date().toISOString());

      this.notifyListeners({ 
        type: 'sync_complete', 
        timestamp: Date.now(), 
        result 
      });

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners({ 
        type: 'sync_error', 
        timestamp: Date.now(), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return { success: false, synced: 0, conflicts: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync all data (for initial sync)
  private async syncAllData(): Promise<SyncResult> {
    let synced = 0;
    let conflicts = 0;
    const errors: string[] = [];

    try {
      // Sync questions first (they're read-only from client perspective)
      const questionsResult = await this.syncQuestions();
      synced += questionsResult.synced;
      conflicts += questionsResult.conflicts;
      errors.push(...questionsResult.errors);

      // Sync assessments
      const assessmentsResult = await this.syncAssessments();
      synced += assessmentsResult.synced;
      conflicts += assessmentsResult.conflicts;
      errors.push(...assessmentsResult.errors);

      // Sync responses
      const responsesResult = await this.syncResponses();
      synced += responsesResult.synced;
      conflicts += responsesResult.conflicts;
      errors.push(...responsesResult.errors);

      // Sync submissions
      const submissionsResult = await this.syncSubmissions();
      synced += submissionsResult.synced;
      conflicts += submissionsResult.conflicts;
      errors.push(...submissionsResult.errors);

      return {
        success: errors.length === 0,
        synced,
        conflicts,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { success: false, synced, conflicts, errors };
    }
  }

  // Push local changes to server
  private async pushLocalChanges(): Promise<SyncResult> {
    const unsyncedItems = await offlineDB.getUnsyncedItems();
    let synced = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Process sync queue
    const syncQueue = await offlineDB.getSyncQueue();

    for (const item of syncQueue) {
      try {
        const result = await this.processSyncQueueItem(item);
        if (result.success) {
          await offlineDB.removeSyncQueueItem(item.id);
          synced++;
        } else {
          conflicts++;
          errors.push(result.error || 'Unknown error');

          // Update retry count
          item.retry_count++;
          item.last_error = result.error;
          await offlineDB.updateSyncQueueItem(item);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Push unsynced assessments
    for (const assessment of unsyncedItems.assessments) {
      try {
        await this.pushAssessment(assessment);
        assessment.sync_status = 'synced';
        assessment.last_synced = new Date().toISOString();
        await offlineDB.saveAssessment(assessment);
        synced++;
      } catch (error) {
        conflicts++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Push unsynced responses
    for (const response of unsyncedItems.responses) {
      try {
        await this.pushResponse(response);
        response.sync_status = 'synced';
        response.last_synced = new Date().toISOString();
        await offlineDB.saveResponse(response);
        synced++;
      } catch (error) {
        conflicts++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Push unsynced submissions
    for (const submission of unsyncedItems.submissions) {
      try {
        await this.pushSubmission(submission);
        submission.sync_status = 'synced';
        submission.last_synced = new Date().toISOString();
        await offlineDB.saveSubmission(submission);
        synced++;
      } catch (error) {
        conflicts++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return { success: errors.length === 0, synced, conflicts, errors };
  }

  // Pull remote changes from server
  private async pullRemoteChanges(): Promise<SyncResult> {
    let synced = 0;
    let conflicts = 0;
    const errors: string[] = [];

    try {
      // Pull questions updates
      const questionsResult = await this.syncQuestions();
      synced += questionsResult.synced;
      conflicts += questionsResult.conflicts;
      errors.push(...questionsResult.errors);

      // Pull other data based on user context
      // This would typically involve checking timestamps and pulling only changed data

      return { success: errors.length === 0, synced, conflicts, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { success: false, synced, conflicts, errors };
    }
  }

  // Sync questions from server
  private async syncQuestions(): Promise<SyncResult> {
    try {
      const response = await fetch(`${OpenAPI.BASE}/questions`, {
        headers: {
          'Authorization': `Bearer ${OpenAPI.TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }

      const data = await response.json();
      const questions = data.questions || [];

      // Transform and save questions
      const transformedQuestions = questions.map((qwr: any) => ({
        question_id: qwr.question.question_id,
        category: qwr.question.category,
        revisions: qwr.revisions,
        last_synced: new Date().toISOString()
      }));

      await offlineDB.saveQuestions(transformedQuestions);

      return { success: true, synced: transformedQuestions.length, conflicts: 0, errors: [] };
    } catch (error) {
      return { 
        success: false, 
        synced: 0, 
        conflicts: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  // Sync assessments
  private async syncAssessments(): Promise<SyncResult> {
    // Implementation would fetch user's assessments and sync them
    // This is a placeholder - actual implementation would depend on API structure
    return { success: true, synced: 0, conflicts: 0, errors: [] };
  }

  // Sync responses
  private async syncResponses(): Promise<SyncResult> {
    // Implementation would fetch and sync responses
    // This is a placeholder - actual implementation would depend on API structure
    return { success: true, synced: 0, conflicts: 0, errors: [] };
  }

  // Sync submissions
  private async syncSubmissions(): Promise<SyncResult> {
    // Implementation would fetch and sync submissions
    // This is a placeholder - actual implementation would depend on API structure
    return { success: true, synced: 0, conflicts: 0, errors: [] };
  }

  // Process individual sync queue item
  private async processSyncQueueItem(item: any): Promise<{ success: boolean; error?: string }> {
    try {
      switch (item.operation) {
        case 'create':
          return await this.createRemoteEntity(item);
        case 'update':
          return await this.updateRemoteEntity(item);
        case 'delete':
          return await this.deleteRemoteEntity(item);
        default:
          return { success: false, error: `Unknown operation: ${item.operation}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create entity on remote server
  private async createRemoteEntity(item: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OpenAPI.TOKEN}`,
          ...item.headers,
        },
        body: JSON.stringify(item.data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }

      const result = await response.json();

      // Update local entity with server response if needed
      await this.updateLocalEntityAfterSync(item.entity_type, item.entity_id, result);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Update entity on remote server
  private async updateRemoteEntity(item: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(item.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OpenAPI.TOKEN}`,
          ...item.headers,
        },
        body: JSON.stringify(item.data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }

      const result = await response.json();

      // Update local entity with server response if needed
      await this.updateLocalEntityAfterSync(item.entity_type, item.entity_id, result);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Delete entity on remote server
  private async deleteRemoteEntity(item: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(item.url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${OpenAPI.TOKEN}`,
          ...item.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }

      // Remove local entity after successful deletion
      await this.removeLocalEntityAfterSync(item.entity_type, item.entity_id);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Update local entity after successful sync
  private async updateLocalEntityAfterSync(entityType: string, entityId: string, serverData: any): Promise<void> {
    try {
      switch (entityType) {
        case 'assessment':
          if (serverData.assessment) {
            const assessment = {
              ...serverData.assessment,
              sync_status: 'synced' as const,
              last_synced: new Date().toISOString(),
            };
            await offlineDB.saveAssessment(assessment);
          }
          break;
        case 'response':
          if (serverData.response) {
            const response = {
              ...serverData.response,
              sync_status: 'synced' as const,
              last_synced: new Date().toISOString(),
            };
            await offlineDB.saveResponse(response);
          }
          break;
        case 'submission':
          if (serverData.submission) {
            const submission = {
              ...serverData.submission,
              sync_status: 'synced' as const,
              last_synced: new Date().toISOString(),
            };
            await offlineDB.saveSubmission(submission);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to update local entity after sync:', error);
    }
  }

  // Remove local entity after successful deletion
  private async removeLocalEntityAfterSync(entityType: string, entityId: string): Promise<void> {
    try {
      // Note: In most cases, we might want to mark as deleted rather than actually remove
      // This depends on the application's requirements for data retention
      console.log(`Entity ${entityType}:${entityId} successfully deleted from server`);
    } catch (error) {
      console.error('Failed to handle local entity after deletion:', error);
    }
  }

  // Push assessment to server
  private async pushAssessment(assessment: any): Promise<void> {
    // Implementation would push assessment to server
    // This is a placeholder
  }

  // Push response to server
  private async pushResponse(response: any): Promise<void> {
    // Implementation would push response to server
    // This is a placeholder
  }

  // Push submission to server
  private async pushSubmission(submission: any): Promise<void> {
    // Implementation would push submission to server
    // This is a placeholder
  }

  // Resolve conflicts
  async resolveConflict(
    entityType: string,
    entityId: string,
    resolution: ConflictResolution
  ): Promise<boolean> {
    try {
      // Implementation would resolve conflicts based on strategy
      // This is a placeholder
      return true;
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return false;
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    lastSync?: string;
    pendingItems: number;
    conflicts: number;
  }> {
    const stats = await offlineDB.getStats();
    const lastSync = await offlineDB.getMetadata('last_sync_timestamp');

    return {
      isOnline: this.isOnline,
      lastSync,
      pendingItems: stats.syncQueue,
      conflicts: 0 // Would count actual conflicts
    };
  }

  // Force sync
  async forceSync(): Promise<SyncResult> {
    return await this.performSync();
  }

  // Register for background sync
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }
}

// Types
interface SyncStatus {
  type: 'online' | 'offline' | 'sync_start' | 'sync_complete' | 'sync_error';
  timestamp: number;
  result?: SyncResult;
  error?: string;
}

// Export singleton instance
export const syncService = new SyncService();
export type { SyncResult, SyncStatus, ConflictResolution };
