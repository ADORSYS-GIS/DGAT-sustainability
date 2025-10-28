// Sync Service
// Handles bidirectional synchronization between server and local IndexedDB
// Ensures local data stays in sync with server data

import { offlineDB } from "./indexeddb";
import { DataTransformationService } from "./dataTransformation";
import {
  QuestionsService,
  CategoryCatalogService,
  AssessmentsService,
  SubmissionsService,
  ResponsesService,
  ReportsService,
  OrganizationsService,
  OrganizationMembersService,
  AdminService
} from "@/openapi-rq/requests/services.gen";
import type {
  Question,
  CategoryCatalog,
  OrganizationCategory, // Add OrganizationCategory type
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  AdminSubmissionDetail,
  OrganizationResponse, // Add OrganizationResponse import
  OrganizationCreateRequest // Import OrganizationCreateRequest
} from "@/openapi-rq/requests/types.gen";
import type {
  OfflineOrganization, // Import OfflineOrganization
  OfflineRecommendation, // Import OfflineRecommendation
  ReportCategoryData, // Import ReportCategoryData
  DetailedReport
} from "@/types/offline";
import { getAuthState } from "./shared/authService";
import { reviewService } from "./reviewService";

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
  admin_submissions: SyncResult;
  action_plans: SyncResult;
  pending_assessments: SyncResult;
  pending_review_submissions: SyncResult;
  pending_organizations: SyncResult; // Add pending organizations to sync result
}

export class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.performFullSync();
    });

    window.addEventListener('offline', () => {
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
      console.log('🔄 Skipping sync - user not authenticated');
      return this.getEmptySyncResult();
    }

    if (!this.isOnline || this.isSyncing) {
      return this.getEmptySyncResult();
    }

    this.isSyncing = true;
    const results: FullSyncResult = this.getEmptySyncResult();

    try {
      console.log('🔄 Starting full sync...');

      // Get user roles to determine what to sync
      const authState = getAuthState();
      const isDrgvAdmin = authState.roles.includes('drgv_admin');

      // Define sync tasks based on user role
      const syncTasks: Promise<SyncResult>[] = [
        this.syncQuestions(),
        this.syncCategories(),
        this.syncOrganizationCategories(), // Add syncOrganizationCategories
      ];

      // Only sync assessments, submissions, and reports for non-DGRV admin users
      if (!isDrgvAdmin) {
        syncTasks.push(
          this.syncPendingAssessments(),
          this.syncSubmissions(),
          this.syncReports(),
          this.syncPendingReviewSubmissions(),
          this.syncPendingDraftSubmissions(), // Add this line
        );
      }

      // Always sync organizations for DGRV admin
      if (isDrgvAdmin) {
        syncTasks.push(this.syncOrganizations());
        syncTasks.push(this.syncAdminSubmissions());
        syncTasks.push(this.syncActionPlans());
        syncTasks.push(this.syncPendingOrganizations()); // Add pending organizations sync
      }

      // Sync all data types in parallel
      const syncResults = await Promise.allSettled(syncTasks);

      // Collect results
      let taskIndex = 0;
      
      // Questions and categories are always synced
      const questionsResult = syncResults[taskIndex];
      if (questionsResult?.status === 'fulfilled') {
        results.questions = questionsResult.value;
      } else if (questionsResult?.status === 'rejected') {
        results.questions.errors.push(questionsResult.reason?.toString() || 'Unknown error');
      }
      taskIndex++;

      const categoriesResult = syncResults[taskIndex];
      if (categoriesResult?.status === 'fulfilled') {
        results.categories = categoriesResult.value;
      } else if (categoriesResult?.status === 'rejected') {
        results.categories.errors.push(categoriesResult.reason?.toString() || 'Unknown error');
      }
      taskIndex++;

      // Assessments, submissions, and reports only for non-DGRV admin
      if (!isDrgvAdmin) {
        const pendingAssessmentsResult = syncResults[taskIndex];
        if (pendingAssessmentsResult?.status === 'fulfilled') {
          results.pending_assessments = pendingAssessmentsResult.value;
        } else if (pendingAssessmentsResult?.status === 'rejected') {
          results.pending_assessments.errors.push(pendingAssessmentsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;

        const submissionsResult = syncResults[taskIndex];
        if (submissionsResult?.status === 'fulfilled') {
          results.submissions = submissionsResult.value;
        } else if (submissionsResult?.status === 'rejected') {
          results.submissions.errors.push(submissionsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;

        const reportsResult = syncResults[taskIndex];
        if (reportsResult?.status === 'fulfilled') {
          results.reports = reportsResult.value;
        } else if (reportsResult?.status === 'rejected') {
          results.reports.errors.push(reportsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;


        const pendingReviewSubmissionsResult = syncResults[taskIndex];
        if (pendingReviewSubmissionsResult?.status === 'fulfilled') {
          results.pending_review_submissions = pendingReviewSubmissionsResult.value;
        } else if (pendingReviewSubmissionsResult?.status === 'rejected') {
          results.pending_review_submissions.errors.push(pendingReviewSubmissionsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;
      }

      // Organizations only for DGRV admin
      if (isDrgvAdmin) {
        const organizationsResult = syncResults[taskIndex];
        if (organizationsResult?.status === 'fulfilled') {
          results.organizations = organizationsResult.value;
        } else if (organizationsResult?.status === 'rejected') {
          results.organizations.errors.push(organizationsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;
      }

      // Recommendations only for DGRV admin
      if (isDrgvAdmin) {
        const adminSubmissionsResult = syncResults[taskIndex];
        if (adminSubmissionsResult?.status === 'fulfilled') {
          results.admin_submissions = adminSubmissionsResult.value;
        } else if (adminSubmissionsResult?.status === 'rejected') {
          results.admin_submissions.errors.push(adminSubmissionsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;

        const actionPlansResult = syncResults[taskIndex];
        if (actionPlansResult?.status === 'fulfilled') {
          results.action_plans = actionPlansResult.value;
        } else if (actionPlansResult?.status === 'rejected') {
          results.action_plans.errors.push(actionPlansResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;

        const pendingOrganizationsResult = syncResults[taskIndex];
        if (pendingOrganizationsResult?.status === 'fulfilled') {
          results.pending_organizations = pendingOrganizationsResult.value;
        } else if (pendingOrganizationsResult?.status === 'rejected') {
          results.pending_organizations.errors.push(pendingOrganizationsResult.reason?.toString() || 'Unknown error');
        }
        taskIndex++;
      }

      console.log('✅ Full sync completed:', results);

    } catch (error) {
      console.error('❌ Full sync failed:', error);
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  /**
   * Sync questions from server to local
   */
  private async syncQuestions(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'questions', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get server questions
      const serverQuestionsResponse = await QuestionsService.getQuestions();
      const serverQuestions: Question[] = serverQuestionsResponse.questions.map(q => q.question); // Extract Question from QuestionWithRevisionsResponse

      // If server returns no questions, clear the local store completely
      if (serverQuestions.length === 0) {
        // Need to get the current count of local questions before clearing for the result.deleted count
        const currentLocalQuestions = await offlineDB.getAllQuestions();
        await offlineDB.clearStore('questions');
        result.deleted = currentLocalQuestions.length; // All local questions are considered deleted
        return result;
      }
      
      const serverQuestionIds = new Set(serverQuestions.map(q => q.question_id));

      // Get local questions
      const localQuestions = await offlineDB.getAllQuestions();
      const localQuestionIds = new Set(localQuestions.map(q => q.question_id));

      // Find questions to add/update
      for (const serverQuestion of serverQuestions) {
        const localQuestion = localQuestions.find(q => q.question_id === serverQuestion.question_id);
        
        if (!localQuestion) {
          // Add new question
          const categories = await offlineDB.getAllCategoryCatalogs();
          const categoryIdToNameMap = new Map(categories.map(c => [c.category_catalog_id, c.name]));
          const offlineQuestion = DataTransformationService.transformQuestion(serverQuestion, categoryIdToNameMap);
          await offlineDB.saveQuestion(offlineQuestion);
          result.added++;
        } else {
          // Check if the server version is more recent or if local has no pending changes
          // For now, we'll always update if the server version exists to ensure consistency
          const categories = await offlineDB.getAllCategoryCatalogs();
          const categoryIdToNameMap = new Map(categories.map(c => [c.category_catalog_id, c.name]));
          const offlineQuestion = DataTransformationService.transformQuestion(serverQuestion, categoryIdToNameMap);
          await offlineDB.saveQuestion(offlineQuestion);
          result.updated++;
        }
      }

      // Find questions to delete (local questions not on server)
      for (const localQuestion of localQuestions) {
        if (!serverQuestionIds.has(localQuestion.question_id) && !localQuestion.question_id.startsWith('temp_')) {
          await offlineDB.deleteQuestion(localQuestion.question_id);
          result.deleted++;
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync categories from server to local
   */
  private async syncCategories(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'category_catalogs', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get server categories
      const serverCategoriesResponse = await CategoryCatalogService.getCategoryCatalog();
      const serverCategories = serverCategoriesResponse.category_catalogs;
      
      // If server returns no categories, clear the local store completely
      if (serverCategories.length === 0) {
        const currentLocalCategories = await offlineDB.getAllCategoryCatalogs();
        await offlineDB.clearStore('category_catalogs');
        result.deleted = currentLocalCategories.length;
        return result;
      }

      const serverCategoryIds = new Set(serverCategories.map(c => c.category_catalog_id));

      // Get local categories
      const localCategories = await offlineDB.getAllCategoryCatalogs();

      // Find categories to add/update
      for (const serverCategory of serverCategories) {
        const localCategory = localCategories.find(c => c.category_catalog_id === serverCategory.category_catalog_id);
        
        if (!localCategory) {
          // Add new category
          const offlineCategory = DataTransformationService.transformCategoryCatalog(serverCategory);
          await offlineDB.saveCategoryCatalog(offlineCategory);
          result.added++;
        } else {
          // Update existing category if different
          const offlineCategory = DataTransformationService.transformCategoryCatalog(serverCategory);
          await offlineDB.saveCategoryCatalog(offlineCategory);
          result.updated++;
        }
      }

      // Find categories to delete (local categories not on server)
      for (const localCategory of localCategories) {
        if (!serverCategoryIds.has(localCategory.category_catalog_id) && !localCategory.category_catalog_id.startsWith('temp_')) {
          await offlineDB.deleteCategoryCatalog(localCategory.category_catalog_id);
          result.deleted++;
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync organization categories from server to local
   */
  private async syncOrganizationCategories(): Promise<SyncResult> {
    console.log("🔄 Starting syncOrganizationCategories...");
    const result: SyncResult = { entityType: 'organization_categories', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const authState = getAuthState();
      const organizationId = authState.organizationId;

      if (!organizationId) {
        result.errors.push('User is not associated with an organization.');
        return result;
      }

      // Get server organization categories
      const serverOrgCategoriesResponse = await OrganizationsService.getOrganizationsByKeycloakOrganizationIdCategories({
        keycloakOrganizationId: organizationId
      });
      console.log("Fetched serverOrgCategoriesResponse:", serverOrgCategoriesResponse);
      // Check if serverOrgCategoriesResponse or its 'categories' property is undefined
      if (!serverOrgCategoriesResponse || !serverOrgCategoriesResponse.organization_categories) {
        console.error("serverOrgCategoriesResponse or its 'organization_categories' property is undefined:", serverOrgCategoriesResponse);
        result.errors.push('Failed to fetch organization categories from server or response format is invalid.');
        return result;
      }
      const serverOrgCategories = serverOrgCategoriesResponse.organization_categories;
      console.log("Extracted serverOrgCategories:", serverOrgCategories);

      // If server returns no categories, clear the local store completely
      if (serverOrgCategories.length === 0) {
        console.log("No server organization categories found. Clearing local store.");
        const currentLocalOrgCategories = await offlineDB.getAllOrganizationCategories();
        await offlineDB.clearStore('organization_categories');
        result.deleted = currentLocalOrgCategories.length;
        return result;
      }
      console.log("Server organization categories found:", serverOrgCategories.length);

      const serverOrgCategoryIds = new Set(serverOrgCategories.map(oc => `${organizationId}-${oc.category_catalog_id}`));
      console.log("Generated serverOrgCategoryIds:", serverOrgCategoryIds);

      // Get local organization categories
      const localOrgCategories = await offlineDB.getAllOrganizationCategories();
      console.log("Local organization categories before sync:", localOrgCategories);

      // Find categories to add/update
      for (const serverOrgCategory of serverOrgCategories) {
        const offlineOrgCategory = DataTransformationService.transformOrganizationCategory(serverOrgCategory, organizationId);
        const localOrgCategory = localOrgCategories.find(loc => loc.id === offlineOrgCategory.id);

        if (!localOrgCategory) {
          // Add new organization category
          console.log("Adding new organization category:", offlineOrgCategory.id);
          await offlineDB.saveOrganizationCategory(offlineOrgCategory);
          result.added++;
        } else {
          // Update existing organization category if different
          console.log("Updating existing organization category:", offlineOrgCategory.id);
          await offlineDB.saveOrganizationCategory(offlineOrgCategory);
          result.updated++;
        }
      }

      // Find categories to delete (local categories not on server)
      for (const localOrgCategory of localOrgCategories) {
        if (!serverOrgCategoryIds.has(localOrgCategory.id)) {
          console.log("Deleting local organization category not on server:", localOrgCategory.id);
          await offlineDB.deleteOrganizationCategory(localOrgCategory.id);
          result.deleted++;
        }
      }

    } catch (error) {
      console.error("Error during syncOrganizationCategories:", error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      console.log("🔄 Finished syncOrganizationCategories. Result:", result);
    }

    return result;
  }


  /**
   * Sync pending assessments (created offline) to server
   */
  private async syncPendingAssessments(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'pending_assessments', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get all pending assessments (created offline)
      const allAssessments = await offlineDB.getAllAssessments();
      const pendingAssessments = allAssessments.filter(a => a.sync_status === 'pending' && a.assessment_id.startsWith('temp_'));

      console.log(`🔄 Found ${pendingAssessments.length} pending assessments to sync`);

      for (const pendingAssessment of pendingAssessments) {
        try {
          // Create assessment request from offline assessment
          const createAssessmentRequest = {
            name: pendingAssessment.name,
            language: pendingAssessment.language || 'en',
            categories: pendingAssessment.categories?.map(cat => cat.category_catalog_id) || [],
          };

          // Call the API to create the assessment
          const response = await AssessmentsService.postAssessments({ requestBody: createAssessmentRequest });

          if (response && response.assessment) {
            const realAssessment = response.assessment;

            // Delete the temporary assessment
            await offlineDB.deleteAssessment(pendingAssessment.assessment_id);

            // Save the real assessment with proper context
            const categories = await offlineDB.getAllCategoryCatalogs();
            const categoryMap = new Map(categories.map(c => [c.category_catalog_id, c]));
            const finalOfflineAssessment = DataTransformationService.transformAssessment(
              realAssessment,
              categoryMap,
              pendingAssessment.organization_id,
              pendingAssessment.user_email
            );
            await offlineDB.saveAssessment(finalOfflineAssessment);

            result.added++;
            console.log(`✅ Successfully synced pending assessment: ${pendingAssessment.name} -> ${realAssessment.assessment_id}`);
          } else {
            throw new Error('API did not return a valid assessment');
          }
        } catch (error) {
          console.error(`❌ Failed to sync pending assessment ${pendingAssessment.assessment_id}:`, error);
          result.errors.push(`Failed to sync assessment ${pendingAssessment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync submissions from server to local
   */
  private async syncSubmissions(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'submissions', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get server submissions (user submissions)
      const serverSubmissionsResponse = await SubmissionsService.getSubmissions();
      const serverSubmissions = serverSubmissionsResponse.submissions;
      
      // If server returns no submissions, clear the local store completely
      if (serverSubmissions.length === 0) {
        const currentLocalSubmissions = await offlineDB.getAllSubmissions();
        await offlineDB.clearStore('submissions');
        result.deleted = currentLocalSubmissions.length;
        return result;
      }
      
      const serverSubmissionIds = new Set(serverSubmissions.map(s => s.submission_id));

      // Get local submissions
      const localSubmissions = await offlineDB.getAllSubmissions();
      const localSubmissionIds = new Set(localSubmissions.map(s => s.submission_id));

      // Find submissions to add/update
      for (const serverSubmission of serverSubmissions) {
        const localSubmission = localSubmissions.find(s => s.submission_id === serverSubmission.submission_id);
        
        if (!localSubmission) {
          // Add new submission
          const offlineSubmission = DataTransformationService.transformSubmission(serverSubmission);
          await offlineDB.saveSubmission(offlineSubmission);
          result.added++;
        } else {
          // Update existing submission if different
          const offlineSubmission = DataTransformationService.transformSubmission(serverSubmission);
          await offlineDB.saveSubmission(offlineSubmission);
          result.updated++;
        }
      }

      // Find submissions to delete (local submissions not on server)
      for (const localSubmission of localSubmissions) {
        if (!serverSubmissionIds.has(localSubmission.submission_id)) {
          await offlineDB.deleteSubmission(localSubmission.submission_id);
          result.deleted++;
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync reports from server to local
   */
  private async syncReports(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'reports', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get server reports
      const serverReportsResponse = await ReportsService.getUserReports();
      const serverReports = serverReportsResponse.reports;

      // If server returns no reports, clear the local store completely
      if (serverReports.length === 0) {
        const currentLocalReports = await offlineDB.getAllReports();
        await offlineDB.clearStore('reports');
        result.deleted = currentLocalReports.length;
        return result;
      }
      
      const serverReportIds = new Set(serverReports.map(r => r.report_id));

      // Get local reports
      const localReports = await offlineDB.getAllReports();
      const localReportIds = new Set(localReports.map(r => r.report_id));

      // Find reports to add/update
      for (const serverReport of serverReports) {
        const localReport = localReports.find(r => r.report_id === serverReport.report_id);
        
        if (!localReport) {
          // Add new report
          const offlineReport = DataTransformationService.transformReport(serverReport);
          await offlineDB.saveReport(offlineReport);
          result.added++;
        } else {
          // Update existing report if different
          const offlineReport = DataTransformationService.transformReport(serverReport);
          await offlineDB.saveReport(offlineReport);
          result.updated++;
        }
      }

      // Find reports to delete (local reports not on server)
      for (const localReport of localReports) {
        if (!serverReportIds.has(localReport.report_id) && !localReport.report_id.startsWith('temp_')) {
          await offlineDB.deleteReport(localReport.report_id);
          result.deleted++;
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync organizations from server to local
   */
  private async syncOrganizations(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'organizations', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Get server organizations (admin organizations)
      const serverOrganizationsResponse = await OrganizationsService.getAdminOrganizations();
      const serverOrganizations: OfflineOrganization[] = serverOrganizationsResponse.map(o => DataTransformationService.transformOrganizationResponseToOffline(o));

      // If server returns no organizations, clear the local store completely
      if (serverOrganizations.length === 0) {
        const currentLocalOrganizations = await offlineDB.getAllOrganizations();
        await offlineDB.clearStore('organizations');
        result.deleted = currentLocalOrganizations.length;
        return result;
      }
      
      const serverOrgIds = new Set(serverOrganizations.map(o => o.id));

      // Get local organizations
      const localOrganizations = await offlineDB.getAllOrganizations();
      const localOrgIds = new Set(localOrganizations.map(o => o.id));

      // Find organizations to add/update
      for (const serverOrg of serverOrganizations) {
        const localOrg = localOrganizations.find(o => o.id === serverOrg.id);
        
        if (!localOrg) {
          // Add new organization
          const offlineOrg = DataTransformationService.transformOrganizationResponseToOffline(serverOrg);
          await offlineDB.saveOrganization(offlineOrg);
          result.added++;
        } else {
          // Update existing organization if different
          const offlineOrg = DataTransformationService.transformOrganizationResponseToOffline(serverOrg);
          await offlineDB.saveOrganization(offlineOrg);
          result.updated++;
        }
      }

      // Find organizations to delete (local organizations not on server)
      for (const localOrg of localOrganizations) {
        if (!serverOrgIds.has(localOrg.id) && !localOrg.id.startsWith('temp_')) {
          await offlineDB.deleteOrganization(localOrg.id);
          result.deleted++;
        }
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Get empty sync result
   */
  /**
   * Sync recommendations from server to local (DGRV admin only)
   */
  private async syncAdminSubmissions(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'admin_submissions', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const serverSubmissionsResponse = await AdminService.getAdminSubmissions();
      const serverSubmissions = serverSubmissionsResponse.submissions;

      if (serverSubmissions.length === 0) {
        // We might not want to clear all submissions, just the ones visible to the admin.
        // This requires more sophisticated logic. For now, we'll just add/update.
        return result;
      }

      const localSubmissions = await offlineDB.getAllSubmissions();
      const allAssessments = await offlineDB.getAllAssessments();
      const allOrganizations = await offlineDB.getAllOrganizations();
      const serverSubmissionIds = new Set(serverSubmissions.map(s => s.submission_id));

      for (const serverSubmission of serverSubmissions) {
        const localSubmission = localSubmissions.find(s => s.submission_id === serverSubmission.submission_id);
        const assessment = allAssessments.find(a => a.assessment_id === serverSubmission.assessment_id);
        const offlineSubmission = DataTransformationService.transformAdminSubmission(
          serverSubmission,
          assessment?.name || 'Unknown Assessment'
        );

        if (!localSubmission) {
          await offlineDB.saveSubmission(offlineSubmission);
          result.added++;
        } else {
          await offlineDB.saveSubmission(offlineSubmission);
          result.updated++;
        }
      }

      // Optionally, delete local admin-visible submissions that are no longer on the server
      // This is complex because a submission might be visible to both a user and an admin.
      // We will skip deletion for now to avoid accidentally removing user data.

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private async syncActionPlans(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'action_plans', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const serverActionPlansResponse = await AdminService.getAdminActionPlans();
      const serverActionPlans = serverActionPlansResponse.organizations;

      if (serverActionPlans.length === 0) {
        const currentLocalActionPlans = await offlineDB.getAllActionPlans();
        await offlineDB.clearStore('action_plans');
        result.deleted = currentLocalActionPlans.length;
        return result;
      }

      const serverActionPlanIds = new Set(serverActionPlans.map(ap => ap.organization_id));
      const localActionPlans = await offlineDB.getAllActionPlans();

      for (const serverActionPlan of serverActionPlans) {
        const localActionPlan = localActionPlans.find(ap => ap.organization_id === serverActionPlan.organization_id);
        const offlineActionPlan = DataTransformationService.transformActionPlan(serverActionPlan);

        if (!localActionPlan) {
          await offlineDB.saveActionPlan(offlineActionPlan);
          result.added++;
        } else {
          await offlineDB.saveActionPlan(offlineActionPlan);
          result.updated++;
        }
      }

      for (const localActionPlan of localActionPlans) {
        if (!serverActionPlanIds.has(localActionPlan.organization_id)) {
          await offlineDB.deleteOrganization(localActionPlan.organization_id);
          result.deleted++;
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private getEmptySyncResult(): FullSyncResult {
    return {
      questions: { entityType: 'questions', added: 0, updated: 0, deleted: 0, errors: [] },
      categories: { entityType: 'categories', added: 0, updated: 0, deleted: 0, errors: [] },
      assessments: { entityType: 'assessments', added: 0, updated: 0, deleted: 0, errors: [] },
      responses: { entityType: 'responses', added: 0, updated: 0, deleted: 0, errors: [] },
      submissions: { entityType: 'submissions', added: 0, updated: 0, deleted: 0, errors: [] },
      reports: { entityType: 'reports', added: 0, updated: 0, deleted: 0, errors: [] },
      organizations: { entityType: 'organizations', added: 0, updated: 0, deleted: 0, errors: [] },
      users: { entityType: 'users', added: 0, updated: 0, deleted: 0, errors: [] },
      admin_submissions: { entityType: 'admin_submissions', added: 0, updated: 0, deleted: 0, errors: [] },
      action_plans: { entityType: 'action_plans', added: 0, updated: 0, deleted: 0, errors: [] },
      pending_assessments: { entityType: 'pending_assessments', added: 0, updated: 0, deleted: 0, errors: [] },
      pending_review_submissions: { entityType: 'pending_review_submissions', added: 0, updated: 0, deleted: 0, errors: [] },
      pending_organizations: { entityType: 'pending_organizations', added: 0, updated: 0, deleted: 0, errors: [] }
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

  /**
   * Sync pending review submissions (approved/rejected offline) to server
   */
  private async syncPendingReviewSubmissions(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'pending_review_submissions', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const pendingReviews = await offlineDB.getAllPendingReviewSubmissions();
      const reviewsToSync = pendingReviews.filter(r => r.sync_status === 'pending');

      console.log(`🔄 Found ${reviewsToSync.length} pending review submissions to sync`);

      for (const review of reviewsToSync) {
        try {
          await reviewService.submitReview({
            submission_id: review.submission_id,
            recommendation: JSON.parse(review.recommendation),
            status: review.status,
          });

          // If successful, remove from local DB
          await offlineDB.deletePendingReviewSubmission(review.id);
          result.updated++; // Representing a successful sync
          console.log(`✅ Successfully synced pending review: ${review.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync pending review ${review.id}:`, error);
          result.errors.push(`Failed to sync review ${review.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // If sync fails, update status to 'failed' so it can be retried
          review.sync_status = 'failed';
          await offlineDB.savePendingReviewSubmission(review);
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync pending organizations (created, updated, deleted offline) to server
   */
  private async syncPendingOrganizations(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'pending_organizations', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const syncQueueItems = await offlineDB.getSyncQueue();
      const organizationSyncItems = syncQueueItems.filter(item => item.entity_type === 'organization');

      console.log(`🔄 Found ${organizationSyncItems.length} pending organization sync items`);

      for (const item of organizationSyncItems) {
        try {
          switch (item.operation) {
            case 'create': {
              const createRequestBody = item.data as OrganizationCreateRequest;
              const createResponse = await OrganizationsService.postAdminOrganizations({ requestBody: createRequestBody });
              if (createResponse && createResponse.id) {
                // Update local organization with real ID and synced status
                const tempOrg = await offlineDB.getOrganization(item.entity_id!);
                if (tempOrg) {
                  const newOrg: OfflineOrganization = {
                    ...tempOrg,
                    organization_id: createResponse.id,
                    id: createResponse.id,
                    sync_status: 'synced',
                    local_changes: false,
                    last_synced: new Date().toISOString(),
                  };
                  await offlineDB.saveOrganization(newOrg);
                  await offlineDB.deleteOrganization(item.entity_id!); // Delete the temporary one
                  result.added++;
                }
              } else {
                throw new Error('API did not return a valid organization ID on creation.');
              }
              break;
            }
            case 'update': {
              const updateRequestBody = item.data as OrganizationCreateRequest;
              await OrganizationsService.putAdminOrganizationsById({ id: item.entity_id!, requestBody: updateRequestBody });
              // Update local organization status to synced
              const updatedOrg = await offlineDB.getOrganization(item.entity_id!);
              if (updatedOrg) {
                updatedOrg.sync_status = 'synced';
                updatedOrg.local_changes = false;
                updatedOrg.last_synced = new Date().toISOString();
                await offlineDB.saveOrganization(updatedOrg);
                result.updated++;
              }
              break;
            }
            case 'delete': {
              await OrganizationsService.deleteAdminOrganizationsById({ id: item.entity_id! });
              // Local organization should already be deleted, just confirm sync queue removal
              result.deleted++;
              break;
            }
            default:
              console.warn(`Unknown organization sync operation: ${item.operation}`);
          }
          await offlineDB.removeFromSyncQueue(item.id);
          console.log(`✅ Successfully synced organization operation: ${item.operation} for ID: ${item.entity_id}`);
        } catch (error) {
          console.error(`❌ Failed to sync organization operation ${item.operation} for ID ${item.entity_id}:`, error);
          result.errors.push(`Failed to sync organization ${item.entity_id} (${item.operation}): ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // Increment retry count and update sync queue item
          item.retry_count++;
          if (item.retry_count >= item.max_retries) {
            // Mark as failed if max retries reached
            const failedOrg = await offlineDB.getOrganization(item.entity_id!);
            if (failedOrg) {
              failedOrg.sync_status = 'failed';
              await offlineDB.saveOrganization(failedOrg);
            }
            await offlineDB.removeFromSyncQueue(item.id); // Remove from queue after max retries
            console.error(`❌ Organization sync item ${item.id} failed after ${item.max_retries} retries.`);
          } else {
            await offlineDB.updateSyncQueueItem(item);
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync pending draft submissions (approved offline) to server
   */
  private async syncPendingDraftSubmissions(): Promise<SyncResult> {
    const result: SyncResult = { entityType: 'pending_draft_submissions', added: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const syncQueueItems = await offlineDB.getSyncQueue();
      const draftSubmissionSyncItems = syncQueueItems.filter(item =>
        item.entity_type === 'submission' && item.operation === 'submit'
      );

      console.log(`🔄 Found ${draftSubmissionSyncItems.length} pending draft submission sync items`);

      for (const item of draftSubmissionSyncItems) {
        try {
          const submissionId = item.entity_id;
          if (!submissionId) {
            console.error(`[SyncService] No entity_id found for sync queue item: ${item.id}`);
            result.errors.push(`No entity_id found for sync queue item: ${item.id}`);
            await offlineDB.removeFromSyncQueue(item.id); // Remove invalid item
            continue;
          }

          const draft = await offlineDB.getDraftSubmission(submissionId);
          if (!draft) {
            console.warn(`[SyncService] Draft submission with ID ${submissionId} not found in local DB, assuming already synced or deleted.`);
            await offlineDB.removeFromSyncQueue(item.id);
            continue;
          }

          const assessmentId = draft.assessment_id;
          if (!assessmentId) {
            console.error(`[SyncService] No assessment_id found for draft submission: ${submissionId}`);
            result.errors.push(`No assessment_id found for draft submission: ${submissionId}`);
            await offlineDB.removeFromSyncQueue(item.id); // Remove invalid item
            continue;
          }

          await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId });

          // If successful, remove the draft from local draft_submissions and the sync queue
          await offlineDB.deleteDraftSubmission(submissionId);
          await offlineDB.removeFromSyncQueue(item.id);
          result.updated++; // Represents a successful sync and removal
          console.log(`✅ Successfully synced draft submission: ${submissionId}`);
        } catch (error) {
          console.error(`❌ Failed to sync draft submission ${item.entity_id}:`, error);
          result.errors.push(`Failed to sync draft submission ${item.entity_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // Increment retry count and update sync queue item
          item.retry_count++;
          if (item.retry_count >= item.max_retries) {
            // Mark as failed if max retries reached
            const failedDraft = await offlineDB.getDraftSubmission(item.entity_id!);
            if (failedDraft) {
              failedDraft.sync_status = 'failed';
              await offlineDB.saveDraftSubmission(failedDraft);
            }
            await offlineDB.removeFromSyncQueue(item.id); // Remove from queue after max retries
            console.error(`❌ Draft submission sync item ${item.id} failed after ${item.max_retries} retries.`);
          } else {
            await offlineDB.updateSyncQueueItem(item);
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

}
// Export singleton instance
export const syncService = new SyncService();