import { openDB, DBSchema, IDBPDatabase, deleteDB } from "idb";
import type {
  OfflineDatabaseSchema,
  OfflineQuestion,
  OfflineAssessment,
  OfflineResponse,
  OfflineCategory,
  OfflineSubmission,
  OfflineReport,
  OfflineOrganization,
  OfflineUser,
  OfflineInvitation,
  SyncQueueItem,
  SyncStatus,
  NetworkStatus,
  ConflictData,
  DataLoadingProgress,
  DatabaseStats,
  QuestionFilters,
  AssessmentFilters,
  ResponseFilters,
  SubmissionFilters,
  UserFilters
} from "@/types/offline";

// Enhanced IndexedDB Database Class
class OfflineDB {
  private dbPromise: Promise<IDBPDatabase<OfflineDatabaseSchema>>;
  private readonly DB_NAME = "dgat-offline-db";
  private readonly DB_VERSION = 3;

  constructor() {
    this.dbPromise = openDB<OfflineDatabaseSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db, oldVersion, newVersion) => {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}...`);
        
        try {
          // Create all object stores with proper indexing
          this.createObjectStores(db);
          console.log('✅ Database upgrade completed successfully');
        } catch (error) {
          console.error('❌ Database upgrade failed:', error);
          throw error;
        }
      },
      blocked: () => {
        console.warn("Database upgrade was blocked");
      },
      blocking: () => {
        console.warn("Database is blocking another connection");
      },
      terminated: () => {
        console.error("Database connection was terminated");
      }
    });
  }

  private createObjectStores(db: IDBPDatabase<OfflineDatabaseSchema>) {
    // Check if object stores already exist before creating them
    const existingStores = Array.from(db.objectStoreNames);
    console.log('Existing object stores:', existingStores);

    // Questions store with indexes
    if (!existingStores.includes("questions")) {
      const questionsStore = db.createObjectStore("questions", { keyPath: "question_id" });
      questionsStore.createIndex("category_id", "category_id", { unique: false });
      questionsStore.createIndex("search_text", "search_text", { unique: false });
      questionsStore.createIndex("sync_status", "sync_status", { unique: false });
      questionsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Assessments store with indexes
    if (!existingStores.includes("assessments")) {
      const assessmentsStore = db.createObjectStore("assessments", { keyPath: "assessment_id" });
      assessmentsStore.createIndex("user_id", "user_id", { unique: false });
      assessmentsStore.createIndex("organization_id", "organization_id", { unique: false });
      assessmentsStore.createIndex("status", "status", { unique: false });
      assessmentsStore.createIndex("sync_status", "sync_status", { unique: false });
      assessmentsStore.createIndex("created_at", "created_at", { unique: false });
    }

    // Responses store with indexes
    if (!existingStores.includes("responses")) {
      const responsesStore = db.createObjectStore("responses", { keyPath: "response_id" });
      responsesStore.createIndex("assessment_id", "assessment_id", { unique: false });
      responsesStore.createIndex("question_revision_id", "question_revision_id", { unique: false });
      responsesStore.createIndex("question_category", "question_category", { unique: false });
      responsesStore.createIndex("sync_status", "sync_status", { unique: false });
      responsesStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Categories store with indexes
    if (!existingStores.includes("categories")) {
      const categoriesStore = db.createObjectStore("categories", { keyPath: "category_id" });
      categoriesStore.createIndex("template_id", "template_id", { unique: false });
      categoriesStore.createIndex("is_active", "is_active", { unique: false });
      categoriesStore.createIndex("sync_status", "sync_status", { unique: false });
      categoriesStore.createIndex("order", "order", { unique: false });
    }

    // Submissions store with indexes
    if (!existingStores.includes("submissions")) {
      const submissionsStore = db.createObjectStore("submissions", { keyPath: "submission_id" });
      submissionsStore.createIndex("assessment_id", "assessment_id", { unique: false });
      submissionsStore.createIndex("user_id", "user_id", { unique: false });
      submissionsStore.createIndex("organization_id", "organization_id", { unique: false });
      submissionsStore.createIndex("review_status", "review_status", { unique: false });
      submissionsStore.createIndex("sync_status", "sync_status", { unique: false });
      submissionsStore.createIndex("submitted_at", "submitted_at", { unique: false });
    }

    // Reports store with indexes
    if (!existingStores.includes("reports")) {
      const reportsStore = db.createObjectStore("reports", { keyPath: "report_id" });
      reportsStore.createIndex("submission_id", "submission_id", { unique: false });
      reportsStore.createIndex("report_type", "report_type", { unique: false });
      reportsStore.createIndex("status", "status", { unique: false });
      reportsStore.createIndex("organization_id", "organization_id", { unique: false });
      reportsStore.createIndex("sync_status", "sync_status", { unique: false });
    }

    // Organizations store with indexes
    if (!existingStores.includes("organizations")) {
      const organizationsStore = db.createObjectStore("organizations", { keyPath: "id" });
      organizationsStore.createIndex("name", "name", { unique: false });
      organizationsStore.createIndex("is_active", "is_active", { unique: false });
      organizationsStore.createIndex("sync_status", "sync_status", { unique: false });
    }

    // Users store with indexes
    if (!existingStores.includes("users")) {
      const usersStore = db.createObjectStore("users", { keyPath: "id" });
      usersStore.createIndex("email", "email", { unique: false });
      usersStore.createIndex("organization_id", "organization_id", { unique: false });
      usersStore.createIndex("roles", "roles", { unique: false });
      usersStore.createIndex("sync_status", "sync_status", { unique: false });
    }

    // Invitations store with indexes
    if (!existingStores.includes("invitations")) {
      const invitationsStore = db.createObjectStore("invitations", { keyPath: "invitation_id" });
      invitationsStore.createIndex("organization_id", "organization_id", { unique: false });
      invitationsStore.createIndex("email", "email", { unique: false });
      invitationsStore.createIndex("status", "status", { unique: false });
      invitationsStore.createIndex("sync_status", "sync_status", { unique: false });
    }

    // Pending review submissions store with indexes (NEW in version 3)
    if (!existingStores.includes("pending_review_submissions")) {
      console.log('Creating pending_review_submissions object store...');
      const pendingReviewsStore = db.createObjectStore("pending_review_submissions", { keyPath: "id" });
      pendingReviewsStore.createIndex("submission_id", "submission_id", { unique: false });
      pendingReviewsStore.createIndex("reviewer", "reviewer", { unique: false });
      pendingReviewsStore.createIndex("sync_status", "sync_status", { unique: false });
      pendingReviewsStore.createIndex("timestamp", "timestamp", { unique: false });
      console.log('✅ pending_review_submissions object store created');
    }

    // Sync Queue store with indexes
    if (!existingStores.includes("sync_queue")) {
      const syncQueueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
      syncQueueStore.createIndex("entity_type", "entity_type", { unique: false });
      syncQueueStore.createIndex("priority", "priority", { unique: false });
      syncQueueStore.createIndex("retry_count", "retry_count", { unique: false });
      syncQueueStore.createIndex("created_at", "created_at", { unique: false });
    }

    // Status stores (single key)
    if (!existingStores.includes("sync_status")) {
      db.createObjectStore("sync_status", { keyPath: "key" });
    }
    if (!existingStores.includes("network_status")) {
      db.createObjectStore("network_status", { keyPath: "key" });
    }
    if (!existingStores.includes("loading_progress")) {
      db.createObjectStore("loading_progress", { keyPath: "key" });
    }
    if (!existingStores.includes("database_stats")) {
      db.createObjectStore("database_stats", { keyPath: "key" });
    }

    // Conflicts store with indexes
    if (!existingStores.includes("conflicts")) {
      const conflictsStore = db.createObjectStore("conflicts", { keyPath: "id", autoIncrement: true });
      conflictsStore.createIndex("entity_type", "entity_type", { unique: false });
      conflictsStore.createIndex("entity_id", "entity_id", { unique: false });
      conflictsStore.createIndex("resolved", "resolved", { unique: false });
    }
  }

  // ===== QUESTIONS =====
  async saveQuestion(question: OfflineQuestion): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("questions", question);
    return result as string;
  }

  async saveQuestions(questions: OfflineQuestion[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("questions", "readwrite");
    await Promise.all(questions.map(q => tx.store.put(q)));
    await tx.done;
  }

  async getQuestion(questionId: string): Promise<OfflineQuestion | undefined> {
    const db = await this.dbPromise;
    return db.get("questions", questionId);
  }

  async getAllQuestions(): Promise<OfflineQuestion[]> {
    const db = await this.dbPromise;
    return db.getAll("questions");
  }

  async getQuestionsByCategory(categoryId: string): Promise<OfflineQuestion[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("questions", "readonly");
    const index = tx.store.index("category_id");
    return index.getAll(categoryId);
  }

  async searchQuestions(searchText: string): Promise<OfflineQuestion[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("questions", "readonly");
    const index = tx.store.index("search_text");
    return index.getAll(searchText);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("questions", questionId);
  }

  // ===== ASSESSMENTS =====
  async saveAssessment(assessment: OfflineAssessment): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("assessments", assessment);
    return result as string;
  }

  async saveAssessments(assessments: OfflineAssessment[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readwrite");
    await Promise.all(assessments.map(a => tx.store.put(a)));
    await tx.done;
  }

  async getAssessment(assessmentId: string): Promise<OfflineAssessment | undefined> {
    const db = await this.dbPromise;
    return db.get("assessments", assessmentId);
  }

  async getAllAssessments(): Promise<OfflineAssessment[]> {
    const db = await this.dbPromise;
    return db.getAll("assessments");
  }

  async getAssessmentsByUser(userId: string): Promise<OfflineAssessment[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readonly");
    const index = tx.store.index("user_id");
    return index.getAll(userId);
  }

  async getAssessmentsByOrganization(organizationId: string): Promise<OfflineAssessment[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readonly");
    const index = tx.store.index("organization_id");
    return index.getAll(organizationId);
  }

  async getAssessmentsByStatus(status: string): Promise<OfflineAssessment[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readonly");
    const index = tx.store.index("status");
    return index.getAll(status);
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("assessments", assessmentId);
  }

  // ===== RESPONSES =====
  async saveResponse(response: OfflineResponse): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("responses", response);
    return result as string;
  }

  async saveResponses(responses: OfflineResponse[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("responses", "readwrite");
    await Promise.all(responses.map(r => tx.store.put(r)));
    await tx.done;
  }

  async getResponse(responseId: string): Promise<OfflineResponse | undefined> {
    const db = await this.dbPromise;
    return db.get("responses", responseId);
  }

  async getResponsesByAssessment(assessmentId: string): Promise<OfflineResponse[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("responses", "readonly");
    const index = tx.store.index("assessment_id");
    return index.getAll(assessmentId);
  }

  async getResponsesByCategory(category: string): Promise<OfflineResponse[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("responses", "readonly");
    const index = tx.store.index("question_category");
    return index.getAll(category);
  }

  async deleteResponse(responseId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("responses", responseId);
  }

  // ===== CATEGORIES =====
  async saveCategory(category: OfflineCategory): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("categories", category);
    return result as string;
  }

  async saveCategories(categories: OfflineCategory[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("categories", "readwrite");
    await Promise.all(categories.map(c => tx.store.put(c)));
    await tx.done;
  }

  async getCategory(categoryId: string): Promise<OfflineCategory | undefined> {
    const db = await this.dbPromise;
    return db.get("categories", categoryId);
  }

  async getAllCategories(): Promise<OfflineCategory[]> {
    const db = await this.dbPromise;
    return db.getAll("categories");
  }

  async getCategoriesByTemplate(templateId: string): Promise<OfflineCategory[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("categories", "readonly");
    const index = tx.store.index("template_id");
    return index.getAll(templateId);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("categories", categoryId);
  }

  // ===== SUBMISSIONS =====
  async saveSubmission(submission: OfflineSubmission): Promise<string> {
    try {
      console.log('🔍 saveSubmission called with:', submission);
      const db = await this.dbPromise;
      console.log('🔍 Database connection established');
      
      const result = await db.put("submissions", submission);
      console.log('✅ Submission saved successfully with result:', result);
      return result as string;
    } catch (error) {
      console.error('❌ Error saving submission:', error);
      console.error('❌ Submission data:', submission);
      throw error;
    }
  }

  async saveSubmissions(submissions: OfflineSubmission[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("submissions", "readwrite");
    await Promise.all(submissions.map(s => tx.store.put(s)));
    await tx.done;
  }

  async getSubmission(submissionId: string): Promise<OfflineSubmission | undefined> {
    const db = await this.dbPromise;
    return db.get("submissions", submissionId);
  }

  async getAllSubmissions(): Promise<OfflineSubmission[]> {
    const db = await this.dbPromise;
    return db.getAll("submissions");
  }

  async getSubmissionsByUser(userId: string): Promise<OfflineSubmission[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("submissions", "readonly");
    const index = tx.store.index("user_id");
    return index.getAll(userId);
  }

  async getSubmissionsByOrganization(organizationId: string): Promise<OfflineSubmission[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("submissions", "readonly");
    const index = tx.store.index("organization_id");
    return index.getAll(organizationId);
  }

  async getSubmissionsByStatus(status: string): Promise<OfflineSubmission[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("submissions", "readonly");
    const index = tx.store.index("review_status");
    return index.getAll(status);
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("submissions", submissionId);
  }

  // ===== REPORTS =====
  async saveReport(report: OfflineReport): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("reports", report);
    return result as string;
  }

  async saveReports(reports: OfflineReport[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("reports", "readwrite");
    await Promise.all(reports.map(r => tx.store.put(r)));
    await tx.done;
  }

  async getReport(reportId: string): Promise<OfflineReport | undefined> {
    const db = await this.dbPromise;
    return db.get("reports", reportId);
  }

  async getAllReports(): Promise<OfflineReport[]> {
    const db = await this.dbPromise;
    return db.getAll("reports");
  }

  async getReportsBySubmission(submissionId: string): Promise<OfflineReport[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("reports", "readonly");
    const index = tx.store.index("submission_id");
    return index.getAll(submissionId);
  }

  async deleteReport(reportId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("reports", reportId);
  }

  // ===== ORGANIZATIONS =====
  async saveOrganization(organization: OfflineOrganization): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("organizations", organization);
    return result as string;
  }

  async saveOrganizations(organizations: OfflineOrganization[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("organizations", "readwrite");
    await Promise.all(organizations.map(o => tx.store.put(o)));
    await tx.done;
  }

  async getOrganization(organizationId: string): Promise<OfflineOrganization | undefined> {
    const db = await this.dbPromise;
    return db.get("organizations", organizationId);
  }

  async getAllOrganizations(): Promise<OfflineOrganization[]> {
    const db = await this.dbPromise;
    return db.getAll("organizations");
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("organizations", organizationId);
  }

  // ===== USERS =====
  async saveUser(user: OfflineUser): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("users", user);
    return result as string;
  }

  async saveUsers(users: OfflineUser[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("users", "readwrite");
    await Promise.all(users.map(u => tx.store.put(u)));
    await tx.done;
  }

  async getUser(userId: string): Promise<OfflineUser | undefined> {
    const db = await this.dbPromise;
    return db.get("users", userId);
  }

  async getAllUsers(): Promise<OfflineUser[]> {
    const db = await this.dbPromise;
    return db.getAll("users");
  }

  async getUsersByOrganization(organizationId: string): Promise<OfflineUser[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("users", "readonly");
    const index = tx.store.index("organization_id");
    return index.getAll(organizationId);
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("users", userId);
  }

  // ===== INVITATIONS =====
  async saveInvitation(invitation: OfflineInvitation): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("invitations", invitation);
    return result as string;
  }

  async saveInvitations(invitations: OfflineInvitation[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("invitations", "readwrite");
    await Promise.all(invitations.map(i => tx.store.put(i)));
    await tx.done;
  }

  async getInvitation(invitationId: string): Promise<OfflineInvitation | undefined> {
    const db = await this.dbPromise;
    return db.get("invitations", invitationId);
  }

  async getAllInvitations(): Promise<OfflineInvitation[]> {
    const db = await this.dbPromise;
    return db.getAll("invitations");
  }

  async getInvitationsByOrganization(organizationId: string): Promise<OfflineInvitation[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("invitations", "readonly");
    const index = tx.store.index("organization_id");
    return index.getAll(organizationId);
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("invitations", invitationId);
  }

  // ===== SYNC QUEUE =====
  async addToSyncQueue(item: SyncQueueItem): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.add("sync_queue", item);
    return result as string;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.dbPromise;
    return db.getAll("sync_queue");
  }

  async getSyncQueueByPriority(priority: string): Promise<SyncQueueItem[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("sync_queue", "readonly");
    const index = tx.store.index("priority");
    return index.getAll(priority);
  }

  async removeFromSyncQueue(itemId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("sync_queue", itemId);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear("sync_queue");
  }

  // ===== STATUS MANAGEMENT =====
  async saveSyncStatus(status: SyncStatus): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("sync_status", { key: "current", ...status });
    return result as string;
  }

  async getSyncStatus(): Promise<SyncStatus | undefined> {
    const db = await this.dbPromise;
    const result = await db.get("sync_status", "current");
    if (result) {
      const { key, ...status } = result;
      return status as SyncStatus;
    }
    return undefined;
  }

  async saveNetworkStatus(status: NetworkStatus): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("network_status", { key: "current", ...status });
    return result as string;
  }

  async getNetworkStatus(): Promise<NetworkStatus | undefined> {
    const db = await this.dbPromise;
    const result = await db.get("network_status", "current");
    if (result) {
      const { key, ...status } = result;
      return status as NetworkStatus;
    }
    return undefined;
  }

  async saveLoadingProgress(progress: DataLoadingProgress): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("loading_progress", { key: "current", ...progress });
    return result as string;
  }

  async getLoadingProgress(): Promise<DataLoadingProgress | undefined> {
    const db = await this.dbPromise;
    const result = await db.get("loading_progress", "current");
    if (result) {
      const { key, ...progress } = result;
      return progress as DataLoadingProgress;
    }
    return undefined;
  }

  // ===== CONFLICTS =====
  async saveConflict(conflict: ConflictData): Promise<number> {
    const db = await this.dbPromise;
    const result = await db.add("conflicts", conflict);
    return result as number;
  }

  async getAllConflicts(): Promise<ConflictData[]> {
    const db = await this.dbPromise;
    return db.getAll("conflicts");
  }

  async getUnresolvedConflicts(): Promise<ConflictData[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("conflicts", "readonly");
    const index = tx.store.index("resolved");
    return index.getAll(IDBKeyRange.only(false));
  }

  async resolveConflict(conflictId: number): Promise<void> {
    const db = await this.dbPromise;
    const conflict = await db.get("conflicts", conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolved_at = new Date().toISOString();
      await db.put("conflicts", conflict);
    }
  }

  // ===== DATABASE STATISTICS =====
  async updateDatabaseStats(): Promise<void> {
    const db = await this.dbPromise;
    
    const [
      questions,
      assessments,
      responses,
      categories,
      submissions,
      reports,
      organizations,
      users,
      invitations,
      syncQueue
    ] = await Promise.all([
      db.getAll("questions"),
      db.getAll("assessments"),
      db.getAll("responses"),
      db.getAll("categories"),
      db.getAll("submissions"),
      db.getAll("reports"),
      db.getAll("organizations"),
      db.getAll("users"),
      db.getAll("invitations"),
      db.getAll("sync_queue")
    ]);

    const stats: DatabaseStats = {
      questions_count: questions.length,
      assessments_count: assessments.length,
      responses_count: responses.length,
      categories_count: categories.length,
      submissions_count: submissions.length,
      reports_count: reports.length,
      organizations_count: organizations.length,
      users_count: users.length,
      invitations_count: invitations.length,
      sync_queue_count: syncQueue.length,
      total_size_bytes: 0, // Would need to calculate actual size
      last_updated: new Date().toISOString()
    };

    await db.put("database_stats", { key: "current", ...stats });
  }

  async getDatabaseStats(): Promise<DatabaseStats | undefined> {
    const db = await this.dbPromise;
    const result = await db.get("database_stats", "current");
    if (result) {
      const { key, ...stats } = result;
      return stats as DatabaseStats;
    }
    return undefined;
  }

  // ===== UTILITY METHODS =====
  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    const stores = [
      "questions", "assessments", "responses", "categories", 
      "submissions", "reports", "organizations", "users", 
      "invitations", "sync_queue", "conflicts", "pending_review_submissions"
    ];
    
    await Promise.all(stores.map(store => db.clear(store)));
  }

  async deleteDatabase(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
    
    // Delete the database completely
    await deleteDB(this.DB_NAME);
    console.log('🗑️ Database deleted completely');
    
    // Recreate the database
    this.dbPromise = openDB<OfflineDatabaseSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db, oldVersion, newVersion) => {
        console.log(`Creating new database version ${newVersion}...`);
        this.createObjectStores(db);
      }
    });
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }

  // ===== FILTERED QUERIES =====
  async getQuestionsWithFilters(filters: QuestionFilters): Promise<OfflineQuestion[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("questions", "readonly");
    const store = tx.store;
    
    let questions = await store.getAll();
    
    if (filters.category_id) {
      questions = questions.filter(q => q.category_id === filters.category_id);
    }
    
    if (filters.search_text) {
      const searchLower = filters.search_text.toLowerCase();
      questions = questions.filter(q => 
        q.search_text?.toLowerCase().includes(searchLower) ||
        q.latest_revision.text.toString().toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.is_active !== undefined) {
      questions = questions.filter(q => q.sync_status !== 'failed');
    }
    
    return questions;
  }

  async getAssessmentsWithFilters(filters: AssessmentFilters): Promise<OfflineAssessment[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("assessments", "readonly");
    const store = tx.store;
    
    let assessments = await store.getAll();
    
    if (filters.user_id) {
      assessments = assessments.filter(a => a.user_id === filters.user_id);
    }
    
    if (filters.organization_id) {
      assessments = assessments.filter(a => a.organization_id === filters.organization_id);
    }
    
    if (filters.status) {
      assessments = assessments.filter(a => a.status === filters.status);
    }
    
    if (filters.created_after) {
      assessments = assessments.filter(a => a.created_at >= filters.created_after);
    }
    
    if (filters.created_before) {
      assessments = assessments.filter(a => a.created_at <= filters.created_before);
    }
    
    return assessments;
  }

  async getResponsesWithFilters(filters: ResponseFilters): Promise<OfflineResponse[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("responses", "readonly");
    const store = tx.store;
    
    let responses = await store.getAll();
    
    if (filters.assessment_id) {
      responses = responses.filter(r => r.assessment_id === filters.assessment_id);
    }
    
    if (filters.question_category) {
      responses = responses.filter(r => r.question_category === filters.question_category);
    }
    
    if (filters.is_draft !== undefined) {
      responses = responses.filter(r => r.is_draft === filters.is_draft);
    }
    
    if (filters.updated_after) {
      responses = responses.filter(r => r.updated_at >= filters.updated_after);
    }
    
    return responses;
  }

  async getSubmissionsWithFilters(filters: SubmissionFilters): Promise<OfflineSubmission[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("submissions", "readonly");
    const store = tx.store;
    
    let submissions = await store.getAll();
    
    if (filters.user_id) {
      submissions = submissions.filter(s => s.user_id === filters.user_id);
    }
    
    if (filters.organization_id) {
      submissions = submissions.filter(s => s.organization_id === filters.organization_id);
    }
    
    if (filters.review_status) {
      submissions = submissions.filter(s => s.review_status === filters.review_status);
    }
    
    if (filters.submitted_after) {
      submissions = submissions.filter(s => s.submitted_at >= filters.submitted_after);
    }
    
    if (filters.submitted_before) {
      submissions = submissions.filter(s => s.submitted_at <= filters.submitted_before);
    }
    
    return submissions;
  }

  async getUsersWithFilters(filters: UserFilters): Promise<OfflineUser[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    
    let users = await store.getAll();
    
    // Apply filters
    if (filters.organizationId) {
      users = users.filter(user => user.organization_id === filters.organizationId);
    }
    if (filters.roles && filters.roles.length > 0) {
      users = users.filter(user => 
        filters.roles!.some(role => user.roles.includes(role))
      );
    }
    if (filters.syncStatus) {
      users = users.filter(user => user.sync_status === filters.syncStatus);
    }
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return users;
  }

  // Pending Review Submissions methods
  async savePendingReviewSubmission(pendingReview: any): Promise<string> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readwrite");
    const store = tx.objectStore("pending_review_submissions");
    
    await store.put(pendingReview);
    await tx.done;
    
    console.log('✅ Pending review submission saved:', pendingReview.id);
    return pendingReview.id;
  }

  async getPendingReviewSubmission(id: string): Promise<any | undefined> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readonly");
    const store = tx.objectStore("pending_review_submissions");
    
    return await store.get(id);
  }

  async getAllPendingReviewSubmissions(): Promise<any[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readonly");
    const store = tx.objectStore("pending_review_submissions");
    
    return await store.getAll();
  }

  async getPendingReviewSubmissions(): Promise<any[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readonly");
    const store = tx.objectStore("pending_review_submissions");
    const index = store.index("sync_status");
    
    return await index.getAll("pending");
  }

  async updatePendingReviewSubmission(id: string, syncStatus: 'pending' | 'synced'): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readwrite");
    const store = tx.objectStore("pending_review_submissions");
    
    const pendingReview = await store.get(id);
    if (pendingReview) {
      pendingReview.syncStatus = syncStatus;
      await store.put(pendingReview);
    }
    
    await tx.done;
  }

  async deletePendingReviewSubmission(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readwrite");
    const store = tx.objectStore("pending_review_submissions");
    
    await store.delete(id);
    await tx.done;
  }
}

// Export singleton instance
export const offlineDB = new OfflineDB(); 