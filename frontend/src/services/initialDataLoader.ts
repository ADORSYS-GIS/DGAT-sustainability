// Initial Data Loading Service
// Handles role-based data loading on login with progress tracking

import { 
  QuestionsService,
  CategoriesService,
  AssessmentsService,
  ResponsesService,
  SubmissionsService,
  ReportsService,
  OrganizationsService,
  OrganizationMembersService,
  OrganizationInvitationsService,
  AdminService
} from "@/openapi-rq/requests/services.gen";

import { DataTransformationService } from "./dataTransformation";
import { offlineDB } from "./indexeddb";
import type { DataLoadingProgress } from "@/types/offline";
import type { Question } from "@/openapi-rq/requests/types.gen";

export interface UserContext {
  userId: string;
  userEmail?: string;
  roles: string[];
  organizationId?: string;
  organizationName?: string;
}

export interface LoadingConfig {
  loadQuestions: boolean;
  loadCategories: boolean;
  loadAssessments: boolean;
  loadResponses: boolean;
  loadSubmissions: boolean;
  loadReports: boolean;
  loadOrganizations: boolean;
  loadUsers: boolean;
}

export class InitialDataLoader {
  private progress: DataLoadingProgress = {
    total_items: 0,
    loaded_items: 0,
    current_entity: '',
    status: 'idle',
    started_at: new Date().toISOString(),
  };

  /**
   * Determine loading configuration based on user roles
   */
  static getLoadingConfig(userContext: UserContext): LoadingConfig {
    const { roles } = userContext;
    const isDrgvAdmin = roles.includes('drgv_admin');
    const isOrgAdmin = roles.includes('org_admin');
    const isOrgUser = roles.includes('Org_User');

    return {
      // All users need questions and categories
      loadQuestions: true,
      loadCategories: true,
      
      // Assessment data based on role - exclude DGRV admin
      loadAssessments: isOrgAdmin || isOrgUser,
      loadResponses: isOrgAdmin || isOrgUser,
      loadSubmissions: isOrgAdmin || isOrgUser, // Remove drgv_admin from submissions
      loadReports: isOrgAdmin || isOrgUser, // Remove drgv_admin from reports
      
      // Organization data based on role
      loadOrganizations: isDrgvAdmin,
      loadUsers: isDrgvAdmin || isOrgAdmin,
    };
  }

  /**
   * Load all data based on user role
   */
  async loadAllData(userContext: UserContext): Promise<void> {
    const config = InitialDataLoader.getLoadingConfig(userContext);
    
    // Calculate total items for progress tracking
    this.progress = {
      total_items: this.calculateTotalItems(config),
      loaded_items: 0,
      current_entity: 'Starting data load...',
      status: 'loading',
      started_at: new Date().toISOString(),
    };

    await offlineDB.saveLoadingProgress(this.progress);

    try {
      // Load data in dependency order
      await this.loadQuestionsAndCategories();
      
      if (config.loadOrganizations) {
        await this.loadOrganizations();
      }
      
      if (config.loadUsers) {
        await this.loadUsers(userContext);
      }
      
      if (config.loadAssessments) {
        await this.loadAssessments(userContext);
      }
      
      if (config.loadResponses) {
        await this.loadResponses(userContext);
      }
      
      if (config.loadSubmissions) {
        await this.loadSubmissions(userContext);
      }
      
      if (config.loadReports) {
        await this.loadReports(userContext);
      }
      
      // Calculate derived statistics
      await this.calculateDerivedStats(userContext);

      // Update progress to completed
      this.progress = {
        ...this.progress,
        loaded_items: this.progress.total_items,
        current_entity: 'Data loading completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      await offlineDB.saveLoadingProgress(this.progress);
      
    } catch (error) {
      console.error('❌ Initial data loading failed:', error);
      
      this.progress = {
        ...this.progress,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      };

      await offlineDB.saveLoadingProgress(this.progress);
      throw error;
    }
  }

  /**
   * Load questions and categories (required for all users)
   */
  private async loadQuestionsAndCategories(): Promise<void> {
    try {
      this.updateProgress('Loading categories...', 1);
      
      // Load categories first
      const categoriesData = await CategoriesService.getCategories();
      if (categoriesData?.categories) {
        const transformedCategories = categoriesData.categories.map(
          DataTransformationService.transformCategory
        );
        
        if (DataTransformationService.validateTransformedData(transformedCategories, 'categories')) {
          await offlineDB.saveCategories(transformedCategories);
        }
      }

      this.updateProgress('Loading questions...', 1);
      
      // Load questions
      const questionsData = await QuestionsService.getQuestions();
      if (questionsData?.questions) {
        
        // The API actually returns Question objects directly, not QuestionWithRevisionsResponse
        // This is a mismatch between the OpenAPI spec and actual implementation
        const questions = questionsData.questions as unknown as Question[];
        
        const transformedQuestions = questions
          .filter(question => {
            if (!question) {
              console.warn('⚠️ Skipping null/undefined question');
              return false;
            }
            return true;
          })
          .map(question => {
            try {
              return DataTransformationService.transformQuestion(question);
            } catch (error) {
              console.error('❌ Failed to transform question:', question, error);
              throw error;
            }
          });
        
        if (DataTransformationService.validateTransformedData(transformedQuestions, 'questions')) {
          await offlineDB.saveQuestions(transformedQuestions);
        }
      } else {
        console.warn('⚠️ No questions data received from API');
      }

    } catch (error) {
      console.error('Failed to load questions and categories:', error);
      throw error;
    }
  }

  /**
   * Load organizations (DGRV Admin only)
   */
  private async loadOrganizations(): Promise<void> {
    try {
      this.updateProgress('Loading organizations...', 1);
      
      const organizationsData = await OrganizationsService.getAdminOrganizations();
      if (organizationsData) {
        const transformedOrganizations = organizationsData.map(
          DataTransformationService.transformOrganization
        );
        
        if (DataTransformationService.validateTransformedData(transformedOrganizations, 'organizations')) {
          await offlineDB.saveOrganizations(transformedOrganizations);
        }
      }

    } catch (error) {
      console.error('Failed to load organizations:', error);
      throw error;
    }
  }

  /**
   * Load users (DGRV Admin and Org Admin)
   */
  private async loadUsers(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Loading users...', 1);
      
      if (userContext.roles.includes('drgv_admin')) {
        // DGRV Admin: Load all users from all organizations
        const organizations = await offlineDB.getAllOrganizations();
        
        for (const org of organizations) {
          try {
            const usersData = await OrganizationMembersService.getOrganizationsByIdMembers({ id: org.id });
            if (usersData) {
              const transformedUsers = DataTransformationService.transformUsersWithContext(
                usersData,
                org.id
              );
              
              if (DataTransformationService.validateTransformedData(transformedUsers, 'users')) {
                await offlineDB.saveUsers(transformedUsers);
              }
            }
          } catch (error) {
            console.warn(`Failed to load users for organization ${org.name}:`, error);
          }
        }
      } else if (userContext.roles.includes('org_admin') && userContext.organizationId) {
        // Org Admin: Load users from their organization
        const usersData = await OrganizationMembersService.getOrganizationsByIdOrgAdminMembers({ 
          id: userContext.organizationId 
        });
        
        if (usersData) {
          const transformedUsers = DataTransformationService.transformUsersWithContext(
            usersData,
            userContext.organizationId
          );
          
          if (DataTransformationService.validateTransformedData(transformedUsers, 'users')) {
            await offlineDB.saveUsers(transformedUsers);
          }
        }
      }

    } catch (error) {
      console.error('Failed to load users:', error);
      throw error;
    }
  }

  /**
   * Load assessments (Org Admin and Org User)
   */
  private async loadAssessments(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Loading assessments...', 1);
      
      const assessmentsData = await AssessmentsService.getAssessments();
      
      if (assessmentsData?.assessments) {
        const transformedAssessments = DataTransformationService.transformAssessmentsWithContext(
          assessmentsData.assessments,
          userContext.organizationId,
          userContext.userEmail
        );
        
        if (DataTransformationService.validateTransformedData(transformedAssessments, 'assessments')) {
          await offlineDB.saveAssessments(transformedAssessments);
        }
      }
    } catch (error) {
      console.error('Failed to load assessments:', error);
      throw error;
    }
  }

  /**
   * Load responses (Org Admin and Org User)
   */
  private async loadResponses(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Loading responses...', 1);
      
      // Load responses for user's assessments
      const assessments = await offlineDB.getAssessmentsByUser(userContext.userId);
      
      for (const assessment of assessments) {
        try {
          const responsesData = await ResponsesService.getAssessmentsByAssessmentIdResponses({ 
            assessmentId: assessment.assessment_id 
          });
          
          if (responsesData?.responses) {
            const questions = await offlineDB.getAllQuestions();
            // Get current language from localStorage or default to "en"
            const currentLanguage = typeof window !== 'undefined' ? 
              localStorage.getItem('i18n_language') || "en" : "en";
            const transformedResponses = DataTransformationService.transformResponsesWithContext(
              responsesData.responses,
              questions,
              currentLanguage
            );
            
            if (DataTransformationService.validateTransformedData(transformedResponses, 'responses')) {
              await offlineDB.saveResponses(transformedResponses);
            }
          }
        } catch (error) {
          console.warn(`Failed to load responses for assessment ${assessment.assessment_id}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to load responses:', error);
      throw error;
    }
  }

  /**
   * Load submissions (Org Admin and Org User)
   */
  private async loadSubmissions(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Loading submissions...', 1);
      
      // SubmissionsService.getSubmissions() returns submissions for the organization
      const submissionsData = await SubmissionsService.getSubmissions();
      
      if (submissionsData?.submissions) {
        const transformedSubmissions = DataTransformationService.transformSubmissionsWithContext(
          submissionsData.submissions,
          userContext.organizationId,
          userContext.userEmail
        );
        
        if (DataTransformationService.validateTransformedData(transformedSubmissions, 'submissions')) {
          await offlineDB.saveSubmissions(transformedSubmissions);
        } else {
          console.error('❌ InitialDataLoader: Failed to validate transformed submissions');
        }
      } else {
        // No submissions found in API response
      }

    } catch (error) {
      console.error('❌ InitialDataLoader: Failed to load submissions:', error);
      throw error;
    }
  }

  /**
   * Load reports (Org Admin and Org User)
   */
  private async loadReports(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Loading reports...', 1);
      
      // Get organization ID from user context
      const orgId = userContext.organizationId;
      if (!orgId) {
        console.warn('No organization ID found, skipping reports loading');
        return;
      }

      // Load reports for the organization
      const reportsData = await ReportsService.getUserReports();

      if (reportsData?.reports) {
        const transformedReports = reportsData.reports.map(
          report => DataTransformationService.transformReport(report, userContext.organizationId, userContext.userId)
        );
        
        if (DataTransformationService.validateTransformedData(transformedReports, 'reports')) {
          await offlineDB.saveReports(transformedReports);
        }
      }

    } catch (error) {
      console.error('Failed to load reports:', error);
      throw error;
    }
  }

  /**
   * Calculate derived statistics for all entities
   */
  private async calculateDerivedStats(userContext: UserContext): Promise<void> {
    try {
      this.updateProgress('Calculating statistics...', 1);
      
      // Get all data for calculations
      const [organizations, users, assessments, submissions, categories, questions] = await Promise.all([
        offlineDB.getAllOrganizations(),
        offlineDB.getAllUsers(),
        offlineDB.getAllAssessments(),
        offlineDB.getAllSubmissions(),
        offlineDB.getAllCategories(),
        offlineDB.getAllQuestions()
      ]);

      // Update organization statistics
      for (const org of organizations) {
        const updatedOrg = DataTransformationService.calculateOrganizationStats(
          org,
          users,
          assessments,
          submissions
        );
        await offlineDB.saveOrganization(updatedOrg);
      }

      // Update user statistics
      for (const user of users) {
        const updatedUser = DataTransformationService.calculateUserStats(
          user,
          assessments,
          submissions
        );
        await offlineDB.saveUser(updatedUser);
      }

      // Update category statistics
      for (const category of categories) {
        const updatedCategory = DataTransformationService.calculateCategoryStats(
          category,
          questions
        );
        await offlineDB.saveCategory(updatedCategory);
      }

    } catch (error) {
      console.error('Failed to calculate derived statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate total items for progress tracking
   */
  private calculateTotalItems(config: LoadingConfig): number {
    let total = 0;
    
    if (config.loadQuestions) total += 1; // Questions
    if (config.loadCategories) total += 1; // Categories
    if (config.loadOrganizations) total += 1; // Organizations
    if (config.loadUsers) total += 1; // Users
    if (config.loadAssessments) total += 1; // Assessments
    if (config.loadResponses) total += 1; // Responses
    if (config.loadSubmissions) total += 1; // Submissions
    if (config.loadReports) total += 1; // Reports
    
    total += 1; // Statistics calculation
    
    return total;
  }

  /**
   * Update progress tracking
   */
  private async updateProgress(currentEntity: string, increment: number = 1): Promise<void> {
    this.progress = {
      ...this.progress,
      loaded_items: this.progress.loaded_items + increment,
      current_entity: currentEntity,
    };

    await offlineDB.saveLoadingProgress(this.progress);
  }

  /**
   * Get current loading progress
   */
  async getProgress(): Promise<DataLoadingProgress | undefined> {
    return await offlineDB.getLoadingProgress();
  }

  /**
   * Clear loading progress
   */
  async clearProgress(): Promise<void> {
    await offlineDB.saveLoadingProgress({
      total_items: 0,
      loaded_items: 0,
      current_entity: '',
      status: 'idle',
      started_at: new Date().toISOString(),
    });
  }

  /**
   * Check if data loading is required
   */
  async isDataLoadingRequired(userContext?: UserContext): Promise<boolean> {
    // Always load for DGRV admin to ensure /api/admin/submissions is called and stored
    if (userContext?.roles?.includes('drgv_admin')) {
      return true;
    }
    const stats = await offlineDB.getDatabaseStats();
    
    // Always load if no stats exist
    if (!stats) {
      return true;
    }
    
    // Check if questions exist (basic requirement)
    if (stats.questions_count === 0) {
      return true;
    }
    
    // If we have user context, check organization-specific data
    if (userContext?.organizationId) {
      
      // Check if assessments exist for this organization
      const assessments = await offlineDB.getAllAssessments();
      const orgAssessments = assessments.filter(a => a.organization_id === userContext.organizationId);
      
      if (orgAssessments.length === 0) {
        return true;
      }
      
      // Check if submissions exist for this organization
      const submissions = await offlineDB.getAllSubmissions();
      const orgSubmissions = submissions.filter(s => s.organization_id === userContext.organizationId);
      
      if (orgSubmissions.length === 0) {
        return true;
      }
      
      return false;
    }
    
    // Fallback: check global data
    const assessments = await offlineDB.getAllAssessments();
    const submissions = await offlineDB.getAllSubmissions();
    
    if (assessments.length === 0 || submissions.length === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Clear all offline data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await offlineDB.clearAllData();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }
} 