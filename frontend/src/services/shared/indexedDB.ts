// IndexedDB utility for local data storage
const DB_NAME = "DGRV_SustainabilityDB";
const DB_VERSION = 1;

export interface User {
  userId: string;
  username: string;
  password: string; // Will be encrypted
  role: "admin" | "org_admin" | "org_user";
  organizationId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

export interface Organization {
  organizationId: string;
  name: string;
  location: string;
  contactEmail: string;
  description: string;
}

export interface Template {
  templateId: string;
  name: string;
  toolType: "dgat" | "sustainability";
}

export interface Category {
  categoryId: string;
  name: string;
  weight: number;
  templateId: string;
  order: number;
}

export interface Question {
  questionId: string;
  text: Record<string, string>; // Multilingual
  weight: number;
  categoryId: string;
  order: number;
  templateId?: string;
}

export interface Assessment {
  assessmentId: string;
  userId: string;
  organizationId: string;
  templateId: string;
  answers: Record<string, unknown>; // JSON answers
  status: "draft" | "submitted" | "under_review" | "completed";
  score?: number;
  categoryScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface Recommendation {
  recommendationId: string;
  assessmentId: string;
  questionId?: string;
  text: Record<string, string>; // Multilingual
  type: "standard" | "custom";
  createdBy: string;
  createdAt: string;
}

export interface Task {
  taskId: string;
  assessmentId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  dueDate?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  queueId: string;
  action: string;
  data: unknown;
  status: "pending" | "synced" | "failed";
  timestamp: string;
  userId: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", {
            keyPath: "userId",
          });
          userStore.createIndex("username", "username", { unique: true });
        }

        if (!db.objectStoreNames.contains("organizations")) {
          db.createObjectStore("organizations", { keyPath: "organizationId" });
        }

        if (!db.objectStoreNames.contains("templates")) {
          db.createObjectStore("templates", { keyPath: "templateId" });
        }

        if (!db.objectStoreNames.contains("categories")) {
          const categoryStore = db.createObjectStore("categories", {
            keyPath: "categoryId",
          });
          categoryStore.createIndex("templateId", "templateId");
        }

        if (!db.objectStoreNames.contains("questions")) {
          const questionStore = db.createObjectStore("questions", {
            keyPath: "questionId",
          });
          questionStore.createIndex("categoryId", "categoryId");
          questionStore.createIndex("templateId", "templateId");
        }

        if (!db.objectStoreNames.contains("assessments")) {
          const assessmentStore = db.createObjectStore("assessments", {
            keyPath: "assessmentId",
          });
          assessmentStore.createIndex("userId", "userId");
          assessmentStore.createIndex("status", "status");
        }

        if (!db.objectStoreNames.contains("recommendations")) {
          const recStore = db.createObjectStore("recommendations", {
            keyPath: "recommendationId",
          });
          recStore.createIndex("assessmentId", "assessmentId");
        }

        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", {
            keyPath: "taskId",
          });
          taskStore.createIndex("assessmentId", "assessmentId");
        }

        if (!db.objectStoreNames.contains("sync_queue")) {
          const syncStore = db.createObjectStore("sync_queue", {
            keyPath: "queueId",
          });
          syncStore.createIndex("status", "status");
        }
      };
    });
  }

  async add<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: string,
  ): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new IndexedDBService();
