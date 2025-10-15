import { openDB, DBSchema, IDBPDatabase, deleteDB } from "idb";
import { toast } from "sonner";
import type {
  OfflineDatabaseSchema,
  OfflineQuestion,
  OfflineAssessment,
  OfflineResponse,
  OfflineCategoryCatalog,
  OfflineSubmission,
  OfflineReport,
  OfflineOrganization,
  OfflineUser,
  OfflineInvitation,
  OfflineRecommendation, // Add the new type
  OfflineOrganizationCategory,
  OfflinePendingReviewSubmission, // Import OfflinePendingReviewSubmission
  OfflineAdminReport,
  OfflineDraftSubmission,
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
  UserFilters,
  OfflineImage // Import OfflineImage
} from "@/types/offline";
export type { OfflineCategoryCatalog };

// Enhanced IndexedDB Database Class
class OfflineDB {
  private dbPromise: Promise<IDBPDatabase<OfflineDatabaseSchema>>;
  private readonly DB_NAME = "dgat-offline-db";
  private readonly DB_VERSION = 11; // Increment DB_VERSION to trigger upgrade

  constructor() {
    this.dbPromise = openDB<OfflineDatabaseSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db, oldVersion, newVersion) => {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        // The createObjectStores function is idempotent and will create any missing stores.
        // Calling it on every upgrade is a safe way to ensure all stores are present.
        this.createObjectStores(db);
      },
      blocked: () => {
        console.warn("IndexedDB upgrade is blocked. Please close other tabs.");
        toast.warning("A database update is pending. Please close any other open tabs of this application.");
      },
      blocking: () => {
        // This is on the old connection. The user will see the 'blocked' message in the new tab.
        console.warn("This connection is blocking a database upgrade.");
      },
      terminated: () => {
        console.error("IndexedDB connection was terminated.");
        toast.error("Database connection was lost. Please refresh the page.");
      }
    });
  }

  private async upgradeDatabase(db: IDBPDatabase<OfflineDatabaseSchema>, oldVersion: number, newVersion: number) {
    try {
      // Handle database upgrades here
      // For now, we'll just log the upgrade
    } catch (error) {
      throw new Error(`Database upgrade failed: ${error}`);
    }
  }

  private createObjectStores(db: IDBPDatabase<OfflineDatabaseSchema>) {
    // Check if object stores already exist before creating them
    const existingStores = Array.from(db.objectStoreNames);

    // Questions store with indexes
    if (!existingStores.includes("questions")) {
      const questionsStore = db.createObjectStore("questions", { keyPath: "question_id" });
      questionsStore.createIndex("category", "category", { unique: false });
      questionsStore.createIndex("sync_status", "sync_status", { unique: false });
      questionsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Category Catalogs store with indexes
    if (!existingStores.includes("category_catalogs")) {
      const categoryCatalogsStore = db.createObjectStore("category_catalogs", { keyPath: "category_catalog_id" });
      categoryCatalogsStore.createIndex("template_id", "template_id", { unique: false });
      categoryCatalogsStore.createIndex("sync_status", "sync_status", { unique: false });
      categoryCatalogsStore.createIndex("updated_at", "updated_at", { unique: false });
    }
    
    // Assessments store with indexes
    if (!existingStores.includes("assessments")) {
      const assessmentsStore = db.createObjectStore("assessments", { keyPath: "assessment_id" });
      assessmentsStore.createIndex("organization_id", "organization_id", { unique: false });
      assessmentsStore.createIndex("user_id", "user_id", { unique: false });
      assessmentsStore.createIndex("status", "status", { unique: false });
      assessmentsStore.createIndex("sync_status", "sync_status", { unique: false });
      assessmentsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Responses store with indexes
    if (!existingStores.includes("responses")) {
      const responsesStore = db.createObjectStore("responses", { keyPath: "response_id" });
      responsesStore.createIndex("assessment_id", "assessment_id", { unique: false });
      responsesStore.createIndex("question_revision_id", "question_revision_id", { unique: false });
      responsesStore.createIndex("sync_status", "sync_status", { unique: false });
      responsesStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Submissions store with indexes
    if (!existingStores.includes("submissions")) {
      const submissionsStore = db.createObjectStore("submissions", { keyPath: "submission_id" });
      submissionsStore.createIndex("assessment_id", "assessment_id", { unique: false });
      submissionsStore.createIndex("user_id", "user_id", { unique: false });
      submissionsStore.createIndex("organization_id", "organization_id", { unique: false });
      submissionsStore.createIndex("review_status", "review_status", { unique: false });
      submissionsStore.createIndex("sync_status", "sync_status", { unique: false });
      submissionsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Draft Submissions store with indexes
    if (!existingStores.includes("draft_submissions")) {
      const draftSubmissionsStore = db.createObjectStore("draft_submissions", { keyPath: "submission_id" });
      draftSubmissionsStore.createIndex("assessment_id", "assessment_id", { unique: false });
      draftSubmissionsStore.createIndex("user_id", "user_id", { unique: false });
      draftSubmissionsStore.createIndex("organization_id", "organization_id", { unique: false });
      draftSubmissionsStore.createIndex("review_status", "review_status", { unique: false });
      draftSubmissionsStore.createIndex("sync_status", "sync_status", { unique: false });
      draftSubmissionsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Organizations store with indexes
    if (!existingStores.includes("organizations")) {
      const organizationsStore = db.createObjectStore("organizations", { keyPath: "organization_id" });
      organizationsStore.createIndex("sync_status", "sync_status", { unique: false });
      organizationsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Users store with indexes
    if (!existingStores.includes("users")) {
      const usersStore = db.createObjectStore("users", { keyPath: "id" });
      usersStore.createIndex("organization_id", "organization_id", { unique: false });
      usersStore.createIndex("sync_status", "sync_status", { unique: false });
      usersStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Reports store with indexes
    if (!existingStores.includes("reports")) {
      const reportsStore = db.createObjectStore("reports", { keyPath: "report_id" });
      reportsStore.createIndex("assessment_id", "assessment_id", { unique: false });
      reportsStore.createIndex("sync_status", "sync_status", { unique: false });
      reportsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Admin Reports store with indexes
    if (!existingStores.includes("admin_reports")) {
      const adminReportsStore = db.createObjectStore("admin_reports", { keyPath: "report_id" });
      adminReportsStore.createIndex("org_id", "org_id", { unique: false });
      adminReportsStore.createIndex("sync_status", "sync_status", { unique: false });
      adminReportsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Invitations store with indexes
    if (!existingStores.includes("invitations")) {
      const invitationsStore = db.createObjectStore("invitations", { keyPath: "invitation_id" });
      invitationsStore.createIndex("organization_id", "organization_id", { unique: false });
      invitationsStore.createIndex("email", "email", { unique: false });
      invitationsStore.createIndex("sync_status", "sync_status", { unique: false });
      invitationsStore.createIndex("updated_at", "updated_at", { unique: false });
    }

    // Pending review submissions store with indexes
    if (!existingStores.includes("pending_review_submissions")) {
      const pendingReviewsStore = db.createObjectStore("pending_review_submissions", { keyPath: "id" });
      pendingReviewsStore.createIndex("submission_id", "submission_id", { unique: false });
      pendingReviewsStore.createIndex("reviewer", "reviewer", { unique: false });
      pendingReviewsStore.createIndex("sync_status", "sync_status", { unique: false });
      pendingReviewsStore.createIndex("timestamp", "timestamp", { unique: false });
    }

    // Recommendations store with indexes
    if (!existingStores.includes("recommendations")) {
      const recommendationsStore = db.createObjectStore("recommendations", { keyPath: "recommendation_id" });
      recommendationsStore.createIndex("organization_id", "organization_id", { unique: false });
      recommendationsStore.createIndex("report_id", "report_id", { unique: false });
      recommendationsStore.createIndex("category", "category", { unique: false });
      recommendationsStore.createIndex("status", "status", { unique: false });
      recommendationsStore.createIndex("sync_status", "sync_status", { unique: false });
      recommendationsStore.createIndex("updated_at", "updated_at", { unique: false });
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
      const conflictsStore = db.createObjectStore("conflicts", { keyPath: "id" });
      conflictsStore.createIndex("entity_type", "entity_type", { unique: false });
      conflictsStore.createIndex("entity_id", "entity_id", { unique: false });
      conflictsStore.createIndex("created_at", "created_at", { unique: false });
    }
    if (!existingStores.includes("organization_categories")) {
      const orgCategoriesStore = db.createObjectStore("organization_categories", { keyPath: "id" });
      orgCategoriesStore.createIndex("organization_id", "organization_id", { unique: false });
      orgCategoriesStore.createIndex("category_catalog_id", "category_catalog_id", { unique: false });
    }

    // Images store
    if (!existingStores.includes("images")) {
      db.createObjectStore("images", { keyPath: "id" });
    }
  }

  // ===== ORGANIZATION CATEGORIES =====
  async saveOrganizationCategory(orgCategory: OfflineOrganizationCategory): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("organization_categories", orgCategory);
    return result as string;
  }

  async saveOrganizationCategories(orgCategories: OfflineOrganizationCategory[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("organization_categories", "readwrite");
    await Promise.all(orgCategories.map(oc => tx.store.put(oc)));
    await tx.done;
  }

  async getAllOrganizationCategories(): Promise<OfflineOrganizationCategory[]> {
    const db = await this.dbPromise;
    return db.getAll("organization_categories");
  }

  async deleteOrganizationCategory(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("organization_categories", id);
  }

  async clearOrganizationCategoriesStore(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("organization_categories", "readwrite");
    await tx.store.clear();
    await tx.done;
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

  // ===== CATEGORY CATALOGS =====
  async saveCategoryCatalog(categoryCatalog: OfflineCategoryCatalog): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("category_catalogs", categoryCatalog);
    return result as string;
  }
  
  async saveCategoryCatalogs(categoryCatalogs: OfflineCategoryCatalog[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("category_catalogs", "readwrite");
    await Promise.all(categoryCatalogs.map(c => tx.store.put(c)));
    await tx.done;
  }
  
  async getCategoryCatalog(categoryCatalogId: string): Promise<OfflineCategoryCatalog | undefined> {
    const db = await this.dbPromise;
    return db.get("category_catalogs", categoryCatalogId);
  }
  
  async getAllCategoryCatalogs(): Promise<OfflineCategoryCatalog[]> {
    const db = await this.dbPromise;
    return db.getAll("category_catalogs");
  }
  
  async deleteCategoryCatalog(categoryCatalogId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("category_catalogs", categoryCatalogId);
  }
  
  async getOrganizationCategories(organizationId: string): Promise<OfflineCategoryCatalog[]> {
    const db = await this.dbPromise;
    const tx = db.transaction(["organization_categories", "category_catalogs"], "readonly");
    const orgCatStore = tx.objectStore("organization_categories");
    const catStore = tx.objectStore("category_catalogs");
    const orgCatIndex = orgCatStore.index("organization_id");

    const orgCategoryLinks = await orgCatIndex.getAll(organizationId);
    const categoryIds = orgCategoryLinks.map(link => link.category_catalog_id);

    const categories = await Promise.all(
      categoryIds.map(id => catStore.get(id))
    );

    return categories.filter((cat): cat is OfflineCategoryCatalog => cat !== undefined);
  }

  // ===== SUBMISSIONS =====
  async saveSubmission(submission: OfflineSubmission): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("submissions", submission);
    return result as string;
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

  // ===== DRAFT SUBMISSIONS =====
  async saveDraftSubmission(draftSubmission: OfflineDraftSubmission): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("draft_submissions", draftSubmission);
    return result as string;
  }

  async saveDraftSubmissions(draftSubmissions: OfflineDraftSubmission[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("draft_submissions", "readwrite");
    await Promise.all(draftSubmissions.map(s => tx.store.put(s)));
    await tx.done;
  }

  async getDraftSubmission(submissionId: string): Promise<OfflineDraftSubmission | undefined> {
    const db = await this.dbPromise;
    return db.get("draft_submissions", submissionId);
  }

  async getAllDraftSubmissions(): Promise<OfflineDraftSubmission[]> {
    const db = await this.dbPromise;
    return db.getAll("draft_submissions");
  }

  async deleteDraftSubmission(submissionId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("draft_submissions", submissionId);
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
  async saveAdminReports(reports: OfflineAdminReport[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("admin_reports", "readwrite");
    await Promise.all(reports.map(r => tx.store.put(r)));
    await tx.done;
  }

  async getAllAdminReports(): Promise<OfflineAdminReport[]> {
    const db = await this.dbPromise;
    return db.getAll("admin_reports");
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

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.dbPromise;
    await db.put("sync_queue", item);
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
      categoryCatalogs,
      submissions,
      reports,
      organizations,
      users,
      invitations,
      syncQueue,
      recommendations // Add recommendations to the list
    ] = await Promise.all([
      db.getAll("questions"),
      db.getAll("assessments"),
      db.getAll("responses"),
      db.getAll("category_catalogs"),
      db.getAll("submissions"),
      db.getAll("reports"),
      db.getAll("organizations"),
      db.getAll("users"),
      db.getAll("invitations"),
      db.getAll("sync_queue"),
      db.getAll("recommendations") // Get all recommendations
    ]);

    const stats: DatabaseStats = {
      questions_count: questions.length,
      assessments_count: assessments.length,
      responses_count: responses.length,
      categories_count: categoryCatalogs.length,
      submissions_count: submissions.length,
      reports_count: reports.length,
      organizations_count: organizations.length,
      users_count: users.length,
      invitations_count: invitations.length,
      recommendations_count: recommendations.length, // Add recommendations count
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
  /**
   * Clears all data from a specific object store.
   * @param storeName The name of the object store to clear.
   */
  async clearStore(storeName: keyof OfflineDatabaseSchema): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }

  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    
    // Delete all object stores
    const objectStoreNames = Array.from(db.objectStoreNames);
    for (const storeName of objectStoreNames) {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      await store.clear();
      await tx.done;
    }
    
    // Close the database connection
    db.close();
    
    // Delete the database completely
    await deleteDB(this.DB_NAME);
    
    // Recreate the database by reopening it
    this.dbPromise = openDB<OfflineDatabaseSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db, oldVersion, newVersion) => {
        this.createObjectStores(db);
      }
    });
  }

  async deleteDatabase(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
    
    // Delete the database completely
    await deleteDB(this.DB_NAME);
    
    // Recreate the database
    this.dbPromise = openDB<OfflineDatabaseSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db, oldVersion, newVersion) => {
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
    if (filters.organization_id) { // Renamed from organizationId
      users = users.filter(user => user.organization_id === filters.organization_id);
    }
    if (filters.roles && filters.roles.length > 0) {
      users = users.filter(user =>
        filters.roles!.some(role => user.roles.includes(role))
      );
    }
    if (filters.sync_status) { // Renamed from syncStatus
      users = users.filter(user => user.sync_status === filters.sync_status);
    }
    if (filters.search_text) { // Renamed from searchText
      const searchLower = filters.search_text.toLowerCase();
      users = users.filter(user =>
        user.email.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return users;
  }

  // ===== PENDING REVIEW SUBMISSIONS =====
  async savePendingReviewSubmission(pendingReview: OfflinePendingReviewSubmission): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("pending_review_submissions", pendingReview);
    return result as string;
  }

  async getPendingReviewSubmission(id: string): Promise<OfflinePendingReviewSubmission | undefined> {
    const db = await this.dbPromise;
    return db.get("pending_review_submissions", id);
  }

  async getAllPendingReviewSubmissions(): Promise<OfflinePendingReviewSubmission[]> {
    const db = await this.dbPromise;
    return db.getAll("pending_review_submissions");
  }

  async getPendingReviewSubmissions(submissionId?: string, reviewer?: string, syncStatus?: 'pending' | 'synced' | 'failed'): Promise<OfflinePendingReviewSubmission[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readonly");
    const store = tx.objectStore("pending_review_submissions");
    
    let pendingReviews = await store.getAll();

    if (submissionId) {
      pendingReviews = pendingReviews.filter(pr => pr.submission_id === submissionId);
    }
    if (reviewer) {
      pendingReviews = pendingReviews.filter(pr => pr.reviewer === reviewer);
    }
    if (syncStatus) {
      pendingReviews = pendingReviews.filter(pr => pr.sync_status === syncStatus);
    }

    return pendingReviews;
  }

  async updatePendingReviewSubmission(id: string, updates: Partial<OfflinePendingReviewSubmission>): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readwrite");
    const store = tx.objectStore("pending_review_submissions");
    
    const pendingReview = await store.get(id);
    if (pendingReview) {
      const updatedReview = { ...pendingReview, ...updates, timestamp: new Date().toISOString() };
      await store.put(updatedReview);
    }
    
    await tx.done;
  }

  // ===== RECOMMENDATIONS =====
  async saveRecommendation(recommendation: OfflineRecommendation): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("recommendations", recommendation);
    return result as string;
  }

  async saveRecommendations(recommendations: OfflineRecommendation[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("recommendations", "readwrite");
    await Promise.all(recommendations.map(r => tx.store.put(r)));
    await tx.done;
  }

  async getRecommendation(recommendationId: string): Promise<OfflineRecommendation | undefined> {
    const db = await this.dbPromise;
    return db.get("recommendations", recommendationId);
  }

  async getAllRecommendations(): Promise<OfflineRecommendation[]> {
    const db = await this.dbPromise;
    return db.getAll("recommendations");
  }

  async getRecommendationsByOrganization(organizationId: string): Promise<OfflineRecommendation[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("recommendations", "readonly");
    const index = tx.store.index("organization_id");
    return index.getAll(organizationId);
  }
  
  async getRecommendationsByReportId(reportId: string): Promise<OfflineRecommendation[]> {
    const db = await this.dbPromise;
    const tx = db.transaction("recommendations", "readonly");
    const index = tx.store.index("report_id");
    return index.getAll(reportId);
  }

  async updateRecommendationStatus(reportId: string, category: string, recommendationId: string, status: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("recommendations", "readwrite");
    const store = tx.objectStore("recommendations");
    
    const recommendation = await store.get(recommendationId);
    if (recommendation) {
      recommendation.status = status;
      recommendation.sync_status = 'pending'; // Mark as pending for sync
      recommendation.updated_at = new Date().toISOString();
      await store.put(recommendation);
    }
    
    await tx.done;
  }

  async deleteRecommendation(recommendationId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("recommendations", recommendationId);
  }

  async deletePendingReviewSubmission(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction("pending_review_submissions", "readwrite");
    const store = tx.objectStore("pending_review_submissions");
    
    await store.delete(id);
    await tx.done;
  }

  /**
   * Clean up invalid responses (those with empty assessment IDs)
   */
  async cleanupInvalidResponses(): Promise<number> {
    const db = await this.dbPromise;
    const tx = db.transaction("responses", "readwrite");
    const store = tx.objectStore("responses");
    
    const allResponses = await store.getAll();
    let deletedCount = 0;
    
    for (const response of allResponses) {
      if (!response.assessment_id || response.assessment_id.trim() === '') {
        console.warn('🧹 Cleaning up invalid response with empty assessment_id:', response.response_id);
        await store.delete(response.response_id);
        deletedCount++;
      }
    }
    
    await tx.done;
    console.log(`🧹 Cleaned up ${deletedCount} invalid responses`);
    return deletedCount;
  }

  // ===== IMAGES =====
  async saveImage(image: OfflineImage): Promise<string> {
    const db = await this.dbPromise;
    const result = await db.put("images", image);
    return result as string;
  }

  async getImage(id: string): Promise<OfflineImage | undefined> {
    const db = await this.dbPromise;
    return db.get("images", id);
  }
}

// Export singleton instance
export const offlineDB = new OfflineDB();