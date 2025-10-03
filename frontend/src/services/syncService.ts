// Sync Service
// Handles bidirectional synchronization between server and local IndexedDB
// Ensures local data stays in sync with server data

import { offlineDB } from "./indexeddb";
import { DataTransformationService } from "./dataTransformation";
import {
  QuestionsService,
  AssessmentsService,
  ResponsesService,
  SubmissionsService,
  ReportsService,
  OrganizationsService,
  OrganizationCategoriesService,
  AdminService,
  FilesService,
} from "@/openapi-rq/requests/services.gen";
import type {
  Question,
  Category,
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  AdminSubmissionDetail,
  OrganizationResponse, // Add OrganizationResponse import
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineOrganization, // Import OfflineOrganization
} from "@/types/offline";
import { getAuthState } from "./shared/authService";

export interface SyncResult {
  entityType: string;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface FullSyncResult {
  questions: SyncResult;
  categories: SyncResult;
  assessments: SyncResult;
  responses: SyncResult;
  submissions: SyncResult;
  reports: SyncResult;
  organizations: SyncResult;
  users: SyncResult;
}

export class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.performFullSync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(): boolean {
    const authState = getAuthState();
    return authState.isAuthenticated;
  }

  /**
   * Perform a full sync of all data types
   */
  async performFullSync(): Promise<FullSyncResult> {
    // Don't sync if not authenticated
    if (!this.isAuthenticated()) {
      console.log("🔄 Skipping sync - user not authenticated");
      return this.getEmptySyncResult();
    }

    if (!this.isOnline || this.isSyncing) {
      return this.getEmptySyncResult();
    }

    this.isSyncing = true;
    const results: FullSyncResult = this.getEmptySyncResult();

    try {
      console.log("🔄 Starting full sync...");

      // Get user roles to determine what to sync
      const authState = getAuthState();
      const isDrgvAdmin = authState.roles.includes("drgv_admin");

      // Define sync tasks based on user role
      const syncTasks: Promise<SyncResult>[] = [
        this.syncQuestions(),
        this.syncCategories(),
      ];

      // Only sync assessments, submissions, and reports for non-DGRV admin users
      if (!isDrgvAdmin) {
        syncTasks.push(
          this.syncAssessments(),
          this.syncSubmissions(),
          this.syncReports(),
        );
      }

      // Always sync organizations for DGRV admin
      if (isDrgvAdmin) {
        syncTasks.push(this.syncOrganizations());
      }

      // Sync all data types in parallel
      const syncResults = await Promise.allSettled(syncTasks);

      // Collect results
      let taskIndex = 0;

      // Questions and categories are always synced
      const questionsResult = syncResults[taskIndex];
      if (questionsResult?.status === "fulfilled") {
        results.questions = questionsResult.value;
      } else if (questionsResult?.status === "rejected") {
        results.questions.errors.push(
          questionsResult.reason?.toString() || "Unknown error",
        );
      }
      taskIndex++;

      const categoriesResult = syncResults[taskIndex];
      if (categoriesResult?.status === "fulfilled") {
        results.categories = categoriesResult.value;
      } else if (categoriesResult?.status === "rejected") {
        results.categories.errors.push(
          categoriesResult.reason?.toString() || "Unknown error",
        );
      }
      taskIndex++;

      // Assessments, submissions, and reports only for non-DGRV admin
      if (!isDrgvAdmin) {
        const assessmentsResult = syncResults[taskIndex];
        if (assessmentsResult?.status === "fulfilled") {
          results.assessments = assessmentsResult.value;
        } else if (assessmentsResult?.status === "rejected") {
          results.assessments.errors.push(
            assessmentsResult.reason?.toString() || "Unknown error",
          );
        }
        taskIndex++;

        const submissionsResult = syncResults[taskIndex];
        if (submissionsResult?.status === "fulfilled") {
          results.submissions = submissionsResult.value;
        } else if (submissionsResult?.status === "rejected") {
          results.submissions.errors.push(
            submissionsResult.reason?.toString() || "Unknown error",
          );
        }
        taskIndex++;

        const reportsResult = syncResults[taskIndex];
        if (reportsResult?.status === "fulfilled") {
          results.reports = reportsResult.value;
        } else if (reportsResult?.status === "rejected") {
          results.reports.errors.push(
            reportsResult.reason?.toString() || "Unknown error",
          );
        }
        taskIndex++;
      }

      // Organizations only for DGRV admin
      if (isDrgvAdmin) {
        const organizationsResult = syncResults[taskIndex];
        if (organizationsResult?.status === "fulfilled") {
          results.organizations = organizationsResult.value;
        } else if (organizationsResult?.status === "rejected") {
          results.organizations.errors.push(
            organizationsResult.reason?.toString() || "Unknown error",
          );
        }
      }

      console.log("✅ Full sync completed:", results);
    } catch (error) {
      console.error("❌ Full sync failed:", error);
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  /**
   * Sync questions from server to local
   */
  private async syncQuestions(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "questions",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get server questions
      const serverQuestionsResponse = await QuestionsService.getQuestions();
      const serverQuestions: Question[] = serverQuestionsResponse.questions.map(
        (q) => q.question,
      ); // Extract Question from QuestionWithRevisionsResponse

      // If server returns no questions, clear the local store completely
      if (serverQuestions.length === 0) {
        // Need to get the current count of local questions before clearing for the result.deleted count
        const currentLocalQuestions = await offlineDB.getAllQuestions();
        await offlineDB.clearStore("questions");
        result.deleted = currentLocalQuestions.length; // All local questions are considered deleted
        return result;
      }

      const serverQuestionIds = new Set(
        serverQuestions.map((q) => q.question_id),
      );

      // Get local questions
      const localQuestions = await offlineDB.getAllQuestions();
      const localQuestionIds = new Set(
        localQuestions.map((q) => q.question_id),
      );

      // Find questions to add/update
      for (const serverQuestion of serverQuestions) {
        const localQuestion = localQuestions.find(
          (q) => q.question_id === serverQuestion.question_id,
        );

        if (!localQuestion) {
          // Add new question
          const offlineQuestion =
            DataTransformationService.transformQuestion(serverQuestion);
          await offlineDB.saveQuestion(offlineQuestion);
          result.added++;
        } else {
          // Check if the server version is more recent or if local has no pending changes
          // For now, we'll always update if the server version exists to ensure consistency
          const offlineQuestion =
            DataTransformationService.transformQuestion(serverQuestion);
          await offlineDB.saveQuestion(offlineQuestion);
          result.updated++;
        }
      }

      // Find questions to delete (local questions not on server)
      for (const localQuestion of localQuestions) {
        if (
          !serverQuestionIds.has(localQuestion.question_id) &&
          !localQuestion.question_id.startsWith("temp_")
        ) {
          await offlineDB.deleteQuestion(localQuestion.question_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Sync categories from server to local
   */
  private async syncCategories(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "categories",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // TODO: Fix categories sync - no general categories endpoint exists
      // Only organization-specific categories are available
      // const serverCategoriesResponse = await CategoriesService.getCategories();
      // const serverCategories = serverCategoriesResponse.categories;
      const serverCategories: any[] = []; // Temporary fix - no general categories endpoint

      // If server returns no categories, clear the local store completely
      if (serverCategories.length === 0) {
        const currentLocalCategories = await offlineDB.getAllCategories();
        await offlineDB.clearStore("categories");
        result.deleted = currentLocalCategories.length;
        return result;
      }

      const serverCategoryIds = new Set(
        serverCategories.map((c) => c.category_id),
      );

      // Get local categories
      const localCategories = await offlineDB.getAllCategories();
      const localCategoryIds = new Set(
        localCategories.map((c) => c.category_id),
      );

      // Find categories to add/update
      for (const serverCategory of serverCategories) {
        const localCategory = localCategories.find(
          (c) => c.category_id === serverCategory.category_id,
        );

        if (!localCategory) {
          // Add new category
          const offlineCategory =
            DataTransformationService.transformCategory(serverCategory);
          await offlineDB.saveCategory(offlineCategory);
          result.added++;
        } else {
          // Update existing category if different
          const offlineCategory =
            DataTransformationService.transformCategory(serverCategory);
          await offlineDB.saveCategory(offlineCategory);
          result.updated++;
        }
      }

      // Find categories to delete (local categories not on server)
      for (const localCategory of localCategories) {
        if (
          !serverCategoryIds.has(localCategory.category_id) &&
          !localCategory.category_id.startsWith("temp_")
        ) {
          await offlineDB.deleteCategory(localCategory.category_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Sync assessments from server to local
   */
  private async syncAssessments(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "assessments",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get server assessments
      const serverAssessmentsResponse =
        await AssessmentsService.getAssessments();
      const serverAssessments = serverAssessmentsResponse.assessments;

      // If server returns no assessments, clear the local store completely
      if (serverAssessments.length === 0) {
        const currentLocalAssessments = await offlineDB.getAllAssessments();
        await offlineDB.clearStore("assessments");
        result.deleted = currentLocalAssessments.length;
        return result;
      }

      const serverAssessmentIds = new Set(
        serverAssessments.map((a) => a.assessment_id),
      );

      // Get local assessments
      const localAssessments = await offlineDB.getAllAssessments();
      const localAssessmentIds = new Set(
        localAssessments.map((a) => a.assessment_id),
      );

      // Find assessments to add/update
      for (const serverAssessment of serverAssessments) {
        const localAssessment = localAssessments.find(
          (a) => a.assessment_id === serverAssessment.assessment_id,
        );

        if (!localAssessment) {
          // Add new assessment
          const offlineAssessment =
            DataTransformationService.transformAssessment(serverAssessment);
          await offlineDB.saveAssessment(offlineAssessment);
          result.added++;
        } else {
          // Update existing assessment if different
          const offlineAssessment =
            DataTransformationService.transformAssessment(serverAssessment);
          await offlineDB.saveAssessment(offlineAssessment);
          result.updated++;
        }
      }

      // Find assessments to delete (local assessments not on server)
      for (const localAssessment of localAssessments) {
        if (
          !serverAssessmentIds.has(localAssessment.assessment_id) &&
          !localAssessment.assessment_id.startsWith("temp_")
        ) {
          await offlineDB.deleteAssessment(localAssessment.assessment_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Sync submissions from server to local
   */
  private async syncSubmissions(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "submissions",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get server submissions (user submissions)
      const serverSubmissionsResponse =
        await SubmissionsService.getSubmissions();
      const serverSubmissions = serverSubmissionsResponse.submissions;

      // If server returns no submissions, clear the local store completely
      if (serverSubmissions.length === 0) {
        const currentLocalSubmissions = await offlineDB.getAllSubmissions();
        await offlineDB.clearStore("submissions");
        result.deleted = currentLocalSubmissions.length;
        return result;
      }

      const serverSubmissionIds = new Set(
        serverSubmissions.map((s) => s.submission_id),
      );

      // Get local submissions
      const localSubmissions = await offlineDB.getAllSubmissions();
      const localSubmissionIds = new Set(
        localSubmissions.map((s) => s.submission_id),
      );

      // Find submissions to add/update
      for (const serverSubmission of serverSubmissions) {
        const localSubmission = localSubmissions.find(
          (s) => s.submission_id === serverSubmission.submission_id,
        );

        if (!localSubmission) {
          // Add new submission
          const offlineSubmission =
            DataTransformationService.transformSubmission(serverSubmission);
          await offlineDB.saveSubmission(offlineSubmission);
          result.added++;
        } else {
          // Update existing submission if different
          const offlineSubmission =
            DataTransformationService.transformSubmission(serverSubmission);
          await offlineDB.saveSubmission(offlineSubmission);
          result.updated++;
        }
      }

      // Find submissions to delete (local submissions not on server)
      for (const localSubmission of localSubmissions) {
        if (
          !serverSubmissionIds.has(localSubmission.submission_id) &&
          !localSubmission.submission_id.startsWith("temp_")
        ) {
          await offlineDB.deleteSubmission(localSubmission.submission_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Sync reports from server to local
   */
  private async syncReports(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "reports",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get server reports
      const serverReportsResponse = await ReportsService.getUserReports();
      const serverReports = serverReportsResponse.reports;

      // If server returns no reports, clear the local store completely
      if (serverReports.length === 0) {
        const currentLocalReports = await offlineDB.getAllReports();
        await offlineDB.clearStore("reports");
        result.deleted = currentLocalReports.length;
        return result;
      }

      const serverReportIds = new Set(serverReports.map((r) => r.report_id));

      // Get local reports
      const localReports = await offlineDB.getAllReports();
      const localReportIds = new Set(localReports.map((r) => r.report_id));

      // Find reports to add/update
      for (const serverReport of serverReports) {
        const localReport = localReports.find(
          (r) => r.report_id === serverReport.report_id,
        );

        if (!localReport) {
          // Add new report
          const offlineReport =
            DataTransformationService.transformReport(serverReport);
          await offlineDB.saveReport(offlineReport);
          result.added++;
        } else {
          // Update existing report if different
          const offlineReport =
            DataTransformationService.transformReport(serverReport);
          await offlineDB.saveReport(offlineReport);
          result.updated++;
        }
      }

      // Find reports to delete (local reports not on server)
      for (const localReport of localReports) {
        if (
          !serverReportIds.has(localReport.report_id) &&
          !localReport.report_id.startsWith("temp_")
        ) {
          await offlineDB.deleteReport(localReport.report_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Sync organizations from server to local
   */
  private async syncOrganizations(): Promise<SyncResult> {
    const result: SyncResult = {
      entityType: "organizations",
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Get server organizations (admin organizations)
      const serverOrganizationsResponse =
        await OrganizationsService.getAdminOrganizations();
      const serverOrganizations: OfflineOrganization[] =
        serverOrganizationsResponse.map((o) =>
          DataTransformationService.transformOrganizationResponseToOffline(o),
        );

      // If server returns no organizations, clear the local store completely
      if (serverOrganizations.length === 0) {
        const currentLocalOrganizations = await offlineDB.getAllOrganizations();
        await offlineDB.clearStore("organizations");
        result.deleted = currentLocalOrganizations.length;
        return result;
      }

      const serverOrgIds = new Set(serverOrganizations.map((o) => o.id));

      // Get local organizations
      const localOrganizations = await offlineDB.getAllOrganizations();
      const localOrgIds = new Set(localOrganizations.map((o) => o.id));

      // Find organizations to add/update
      for (const serverOrg of serverOrganizations) {
        const localOrg = localOrganizations.find((o) => o.id === serverOrg.id);

        if (!localOrg) {
          // Add new organization
          const offlineOrg =
            DataTransformationService.transformOrganizationResponseToOffline(
              serverOrg,
            );
          await offlineDB.saveOrganization(offlineOrg);
          result.added++;
        } else {
          // Update existing organization if different
          const offlineOrg =
            DataTransformationService.transformOrganizationResponseToOffline(
              serverOrg,
            );
          await offlineDB.saveOrganization(offlineOrg);
          result.updated++;
        }
      }

      // Find organizations to delete (local organizations not on server)
      for (const localOrg of localOrganizations) {
        if (
          !serverOrgIds.has(localOrg.id) &&
          !localOrg.id.startsWith("temp_")
        ) {
          await offlineDB.deleteOrganization(localOrg.id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    return result;
  }

  /**
   * Get empty sync result
   */
  private getEmptySyncResult(): FullSyncResult {
    return {
      questions: {
        entityType: "questions",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      categories: {
        entityType: "categories",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      assessments: {
        entityType: "assessments",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      responses: {
        entityType: "responses",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      submissions: {
        entityType: "submissions",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      reports: {
        entityType: "reports",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      organizations: {
        entityType: "organizations",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
      users: {
        entityType: "users",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
      },
    };
  }

  /**
   * Check if currently syncing
   */
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Check if online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Export singleton instance
export const syncService = new SyncService();
