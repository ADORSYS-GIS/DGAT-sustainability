import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface OfflineDBSchema extends DBSchema {
  assessments: {
    key: string;
    value: {
      assessment_id: string;
      user_id: string;
      language: string;
      created_at: string;
      last_synced?: string;
      sync_status: 'synced' | 'pending' | 'conflict';
    };
    indexes: { 'by-user': string; 'by-sync-status': string };
  };
  questions: {
    key: string;
    value: {
      question_id: string;
      category: string;
      revisions: Array<{
        question_revision_id: string;
        question_id: string;
        text: string;
        language: string;
        version: number;
        created_at: string;
      }>;
      last_synced?: string;
    };
    indexes: { 'by-category': string };
  };
  responses: {
    key: string;
    value: {
      response_id: string;
      assessment_id: string;
      question_revision_id: string;
      response: string;
      version: number;
      updated_at: string;
      last_synced?: string;
      sync_status: 'synced' | 'pending' | 'conflict';
      local_changes?: boolean;
    };
    indexes: { 'by-assessment': string; 'by-sync-status': string };
  };
  submissions: {
    key: string;
    value: {
      submission_id: string;
      assessment_id: string;
      user_id: string;
      content: any;
      review_status: string;
      submitted_at: string;
      reviewed_at?: string;
      last_synced?: string;
      sync_status: 'synced' | 'pending' | 'conflict';
    };
    indexes: { 'by-user': string; 'by-assessment': string; 'by-sync-status': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      operation: 'create' | 'update' | 'delete';
      entity_type: 'assessment' | 'response' | 'submission' | 'question';
      entity_id: string;
      data: any;
      url: string;
      method: 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      timestamp: string;
      retry_count: number;
      last_error?: string;
      max_retries?: number;
    };
    indexes: { 'by-timestamp': string; 'by-entity-type': string };
  };
  app_metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updated_at: string;
    };
  };
}

class OfflineDatabase {
  private db: IDBPDatabase<OfflineDBSchema> | null = null;
  private readonly DB_NAME = 'SustainabilityAssessmentDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDBSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create assessments store
        const assessmentsStore = db.createObjectStore('assessments', {
          keyPath: 'assessment_id',
        });
        assessmentsStore.createIndex('by-user', 'user_id');
        assessmentsStore.createIndex('by-sync-status', 'sync_status');

        // Create questions store
        const questionsStore = db.createObjectStore('questions', {
          keyPath: 'question_id',
        });
        questionsStore.createIndex('by-category', 'category');

        // Create responses store
        const responsesStore = db.createObjectStore('responses', {
          keyPath: 'response_id',
        });
        responsesStore.createIndex('by-assessment', 'assessment_id');
        responsesStore.createIndex('by-sync-status', 'sync_status');

        // Create submissions store
        const submissionsStore = db.createObjectStore('submissions', {
          keyPath: 'submission_id',
        });
        submissionsStore.createIndex('by-user', 'user_id');
        submissionsStore.createIndex('by-assessment', 'assessment_id');
        submissionsStore.createIndex('by-sync-status', 'sync_status');

        // Create sync queue store
        const syncQueueStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
        });
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
        syncQueueStore.createIndex('by-entity-type', 'entity_type');

        // Create app metadata store
        db.createObjectStore('app_metadata', {
          keyPath: 'key',
        });
      },
    });
  }

  private ensureDB(): IDBPDatabase<OfflineDBSchema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Assessment operations
  async saveAssessment(assessment: OfflineDBSchema['assessments']['value']): Promise<void> {
    const db = this.ensureDB();
    await db.put('assessments', assessment);
  }

  async getAssessment(assessmentId: string): Promise<OfflineDBSchema['assessments']['value'] | undefined> {
    const db = this.ensureDB();
    return await db.get('assessments', assessmentId);
  }

  async getAssessmentsByUser(userId: string): Promise<OfflineDBSchema['assessments']['value'][]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('assessments', 'by-user', userId);
  }

  async getAllAssessments(): Promise<OfflineDBSchema['assessments']['value'][]> {
    const db = this.ensureDB();
    return await db.getAll('assessments');
  }

  // Question operations
  async saveQuestion(question: OfflineDBSchema['questions']['value']): Promise<void> {
    const db = this.ensureDB();
    await db.put('questions', question);
  }

  async saveQuestions(questions: OfflineDBSchema['questions']['value'][]): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction('questions', 'readwrite');
    await Promise.all(questions.map(question => tx.store.put(question)));
    await tx.done;
  }

  async getAllQuestions(): Promise<OfflineDBSchema['questions']['value'][]> {
    const db = this.ensureDB();
    return await db.getAll('questions');
  }

  async getQuestionsByCategory(category: string): Promise<OfflineDBSchema['questions']['value'][]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('questions', 'by-category', category);
  }

  // Response operations
  async saveResponse(response: OfflineDBSchema['responses']['value']): Promise<void> {
    const db = this.ensureDB();
    await db.put('responses', response);
  }

  async getResponse(responseId: string): Promise<OfflineDBSchema['responses']['value'] | undefined> {
    const db = this.ensureDB();
    return await db.get('responses', responseId);
  }

  async getResponsesByAssessment(assessmentId: string): Promise<OfflineDBSchema['responses']['value'][]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('responses', 'by-assessment', assessmentId);
  }

  async getLatestResponsesByAssessment(assessmentId: string): Promise<OfflineDBSchema['responses']['value'][]> {
    const responses = await this.getResponsesByAssessment(assessmentId);

    // Group by question_revision_id and get the latest version
    const latestMap = new Map<string, OfflineDBSchema['responses']['value']>();

    responses.forEach(response => {
      const existing = latestMap.get(response.question_revision_id);
      if (!existing || response.version > existing.version) {
        latestMap.set(response.question_revision_id, response);
      }
    });

    return Array.from(latestMap.values());
  }

  // Submission operations
  async saveSubmission(submission: OfflineDBSchema['submissions']['value']): Promise<void> {
    const db = this.ensureDB();
    await db.put('submissions', submission);
  }

  async getSubmission(submissionId: string): Promise<OfflineDBSchema['submissions']['value'] | undefined> {
    const db = this.ensureDB();
    return await db.get('submissions', submissionId);
  }

  async getSubmissionsByUser(userId: string): Promise<OfflineDBSchema['submissions']['value'][]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('submissions', 'by-user', userId);
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<OfflineDBSchema['sync_queue']['value'], 'id' | 'timestamp' | 'retry_count'>): Promise<void> {
    const db = this.ensureDB();
    const syncItem: OfflineDBSchema['sync_queue']['value'] = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };
    await db.put('sync_queue', syncItem);
  }

  async getSyncQueue(): Promise<OfflineDBSchema['sync_queue']['value'][]> {
    const db = this.ensureDB();
    return await db.getAllFromIndex('sync_queue', 'by-timestamp');
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('sync_queue', id);
  }

  async updateSyncQueueItem(item: OfflineDBSchema['sync_queue']['value']): Promise<void> {
    const db = this.ensureDB();
    await db.put('sync_queue', item);
  }

  // Get items that need syncing
  async getUnsyncedItems(entityType?: string): Promise<{
    assessments: OfflineDBSchema['assessments']['value'][];
    responses: OfflineDBSchema['responses']['value'][];
    submissions: OfflineDBSchema['submissions']['value'][];
  }> {
    const db = this.ensureDB();

    const [assessments, responses, submissions] = await Promise.all([
      db.getAllFromIndex('assessments', 'by-sync-status', 'pending'),
      db.getAllFromIndex('responses', 'by-sync-status', 'pending'),
      db.getAllFromIndex('submissions', 'by-sync-status', 'pending'),
    ]);

    return { assessments, responses, submissions };
  }

  // Metadata operations
  async setMetadata(key: string, value: any): Promise<void> {
    const db = this.ensureDB();
    await db.put('app_metadata', {
      key,
      value,
      updated_at: new Date().toISOString(),
    });
  }

  async getMetadata(key: string): Promise<any> {
    const db = this.ensureDB();
    const result = await db.get('app_metadata', key);
    return result?.value;
  }

  // Clear all data (for testing or reset)
  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(['assessments', 'questions', 'responses', 'submissions', 'sync_queue', 'app_metadata'], 'readwrite');

    await Promise.all([
      tx.objectStore('assessments').clear(),
      tx.objectStore('questions').clear(),
      tx.objectStore('responses').clear(),
      tx.objectStore('submissions').clear(),
      tx.objectStore('sync_queue').clear(),
      tx.objectStore('app_metadata').clear(),
    ]);

    await tx.done;
  }

  // Get database statistics
  async getStats(): Promise<{
    assessments: number;
    questions: number;
    responses: number;
    submissions: number;
    syncQueue: number;
    lastSync?: string;
  }> {
    const db = this.ensureDB();

    const [assessments, questions, responses, submissions, syncQueue, lastSync] = await Promise.all([
      db.count('assessments'),
      db.count('questions'),
      db.count('responses'),
      db.count('submissions'),
      db.count('sync_queue'),
      this.getMetadata('last_sync_timestamp'),
    ]);

    return {
      assessments,
      questions,
      responses,
      submissions,
      syncQueue,
      lastSync,
    };
  }
}

// Export singleton instance
export const offlineDB = new OfflineDatabase();
