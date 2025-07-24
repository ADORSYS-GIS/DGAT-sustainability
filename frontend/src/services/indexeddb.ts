import { openDB, DBSchema, IDBPDatabase } from "idb";

// Define the database schema
interface MyDB extends DBSchema {
  questions: {
    key: string;
    value: any;
  };
  assessments: {
    key: string;
    value: any;
  };
  responses: {
    key: string;
    value: any;
  };
  syncQueue: {
    key: number;
    value: any;
  };
}

// Database class
class OfflineDB {
  private dbPromise: Promise<IDBPDatabase<MyDB>>;

  constructor() {
    this.dbPromise = openDB<MyDB>("sustainability-db", 1, {
      upgrade(db) {
        db.createObjectStore("questions", { keyPath: "question_id" });
        db.createObjectStore("assessments", { keyPath: "assessment_id" });
        db.createObjectStore("responses", { keyPath: "response_id" });
        db.createObjectStore("syncQueue", { autoIncrement: true });
      },
    });
  }

  // --- Questions ---
  async saveQuestions(questions: any[]) {
    const db = await this.dbPromise;
    const tx = db.transaction("questions", "readwrite");
    await Promise.all(questions.map((q) => tx.store.put(q)));
    return tx.done;
  }

  async getAllQuestions() {
    const db = await this.dbPromise;
    return db.getAll("questions");
  }

  // --- Assessments ---
  async saveAssessment(assessment: any) {
    const db = await this.dbPromise;
    return db.put("assessments", assessment);
  }

  async getAssessment(id: string) {
    const db = await this.dbPromise;
    return db.get("assessments", id);
  }

  async saveAssessments(assessments: any[]) {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readwrite");
    await Promise.all(assessments.map((a) => tx.store.put(a)));
    return tx.done;
  }

  async getAllAssessments() {
    const db = await this.dbPromise;
    return db.getAll("assessments");
  }

  // --- Responses ---
  async saveResponse(response: any) {
    const db = await this.dbPromise;
    return db.put("responses", response);
  }

  async getResponsesByAssessment(assessmentId: string) {
    const db = await this.dbPromise;
    const allResponses = await db.getAll("responses");
    return allResponses.filter((r) => r.assessment_id === assessmentId);
  }

  // --- Sync Queue ---
  async addToSyncQueue(item: any) {
    const db = await this.dbPromise;
    return db.add("syncQueue", item);
  }

  async getSyncQueue() {
    const db = await this.dbPromise;
    return db.getAll("syncQueue");
  }

  async clearSyncQueue() {
    const db = await this.dbPromise;
    return db.clear("syncQueue");
  }
}

export const offlineDB = new OfflineDB(); 