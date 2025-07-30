// API Interceptor Service
// Provides transparent offline-first behavior by intercepting API calls
// and routing them through IndexedDB first
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { offlineDB } from "./indexeddb";
import { toast } from "sonner";
import type { SyncQueueItem } from "@/types/offline";
import { DataTransformationService } from "./dataTransformation";
import type { 
  Question,
  QuestionRevision, 
  Category,
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  CreateResponseRequest,
  UpdateResponseRequest,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
  OrganizationCreateRequest
} from "@/openapi-rq/requests/types.gen";

export interface InterceptorConfig {
  enableOfflineFirst: boolean;
  enableQueueing: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

export class ApiInterceptor {
  private config: InterceptorConfig;
  private isOnline: boolean = navigator.onLine;

  constructor(config: Partial<InterceptorConfig> = {}) {
    this.config = {
      enableOfflineFirst: true,
      enableQueueing: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.setupNetworkListeners();
    this.setupPeriodicSync();
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      
      // Immediate sync attempt
      this.processQueue();
      
      // Also trigger sync after a short delay to ensure all components are ready
      setTimeout(() => {
        this.processQueue();
      }, 1000);
      
      toast.success('Connection restored. Syncing data...');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      toast.warning('You are now offline. Changes will be synced when connection is restored.');
    });

    // Also trigger sync when the page loads if online
    if (this.isOnline) {
      // Small delay to ensure IndexedDB is ready
      setTimeout(() => {
        this.processQueue();
      }, 2000);
    }
  }

  /**
   * Setup periodic sync check
   */
  private setupPeriodicSync(): void {
    // Check for pending sync items every 30 seconds when online
    setInterval(async () => {
      if (this.isOnline && this.config.enableQueueing) {
        // Check if there are any pending items in the tables
        const allQuestions = await offlineDB.getAllQuestions();
        const allCategories = await offlineDB.getAllCategories();
        const allOrganizations = await offlineDB.getAllOrganizations();
        const allUsers = await offlineDB.getAllUsers();
        const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');
        const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');
        const pendingOrganizations = allOrganizations.filter(o => o.sync_status === 'pending');
        const pendingUsers = allUsers.filter(u => u.sync_status === 'pending');
        const totalPending = pendingQuestions.length + pendingCategories.length + pendingOrganizations.length + pendingUsers.length;
        
        if (totalPending > 0) {
          this.processQueue();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Intercept GET requests - try IndexedDB first, then API
   */
  async interceptGet<T extends Record<string, unknown>>(
    apiCall: () => Promise<T>,
    localGet: () => Promise<T | null>,
    entityType: string,
    entityId?: string
  ): Promise<T> {
    try {
      // Always try local first for GET requests
      const localData = await localGet();
      
      if (localData) {
        // Return local data immediately
        return localData;
      }

      // If no local data and online, fetch from API
      if (this.isOnline) {
        const apiData = await apiCall();
        
        // Store in IndexedDB for future offline access
        await this.storeLocally(apiData, entityType);
        
        return apiData;
      } else {
        // Offline and no local data
        throw new Error(`No local ${entityType} data available and you are offline`);
      }
    } catch (error) {
      console.error(`Failed to get ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Intercept POST/PUT/DELETE requests - store locally and queue for sync
   */
  async interceptMutation<T extends Record<string, unknown>>(
    apiCall: () => Promise<T>,
    localMutation: (data: Record<string, unknown>) => Promise<void>,
    data: Record<string, unknown>,
    entityType: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<T> {
    try {
      // Always store locally first for immediate UI updates
      await localMutation(data);

      // If online, try API call immediately
      if (this.isOnline) {
        try {
          const result = await apiCall();
          
          // Update local data with server response
          await this.updateLocalData(result, entityType);
          
          return result;
        } catch (apiError) {
          console.error(`❌ API call failed for ${entityType}:`, apiError);
          console.warn(`📋 ${entityType} will be synced when online`);
          // Fall through to return data
        }
      }

      // Return the data as if the API call succeeded
      // This provides immediate UI feedback
      return data as T;
    } catch (error) {
      console.error(`Failed to process ${entityType} mutation:`, error);
      throw error;
    }
  }

  /**
   * Store data locally in IndexedDB with proper transformation
   */
  private async storeLocally(data: Record<string, unknown>, entityType: string): Promise<void> {
    try {
      switch (entityType) {
        case 'questions': {
          const questions = data.questions as Question[];
          if (questions && Array.isArray(questions)) {
            const offlineQuestions = questions.map(q => DataTransformationService.transformQuestion(q));
            await offlineDB.saveQuestions(offlineQuestions);
          }
          break;
        }
        case 'categories': {
          const categories = data.categories as Category[];
          if (categories && Array.isArray(categories)) {
            const offlineCategories = categories.map(c => DataTransformationService.transformCategory(c));
            await offlineDB.saveCategories(offlineCategories);
          }
          break;
        }
        case 'assessments': {
          // Handle both single assessment and array of assessments
          if (data.assessment && !Array.isArray(data.assessment)) {
            // Single assessment (from getAssessmentsByAssessmentId)
            const assessment = data.assessment as Assessment;
            const offlineAssessment = DataTransformationService.transformAssessment(assessment);
            await offlineDB.saveAssessment(offlineAssessment);
          } else if (data.assessments && Array.isArray(data.assessments)) {
            // Array of assessments (from getAssessments)
            const assessments = data.assessments as Assessment[];
            const offlineAssessments = assessments.map(a => DataTransformationService.transformAssessment(a));
            await offlineDB.saveAssessments(offlineAssessments);
          }
          break;
        }
        case 'responses': {
          const responses = data.responses as Response[];
          if (responses && Array.isArray(responses)) {
            const offlineResponses = responses.map(r => DataTransformationService.transformResponse(r));
            await offlineDB.saveResponses(offlineResponses);
          }
          break;
        }
        case 'submissions': {
          const submissions = data.submissions as Submission[];
          if (submissions && Array.isArray(submissions)) {
            const offlineSubmissions = submissions.map(s => DataTransformationService.transformSubmission(s));
            await offlineDB.saveSubmissions(offlineSubmissions);
          }
          break;
        }
        case 'reports': {
          const reports = data.reports as Report[];
          if (reports && Array.isArray(reports)) {
            const offlineReports = reports.map(r => DataTransformationService.transformReport(r));
            await offlineDB.saveReports(offlineReports);
          }
          break;
        }
        case 'organizations': {
          const organizations = data.organizations as Organization[];
          if (organizations && Array.isArray(organizations)) {
            const offlineOrganizations = organizations.map(o => DataTransformationService.transformOrganization(o));
            await offlineDB.saveOrganizations(offlineOrganizations);
          }
          break;
        }
        case 'users': {
          const users = data.users as OrganizationMember[];
          if (users && Array.isArray(users)) {
            const offlineUsers = users.map(u => DataTransformationService.transformUser(u, 'org_id'));
            await offlineDB.saveUsers(offlineUsers);
          }
          break;
        }
        case 'invitations': {
          const invitations = data.invitations as OrganizationInvitation[];
          if (invitations && Array.isArray(invitations)) {
            const offlineInvitations = invitations.map(i => DataTransformationService.transformInvitation(i));
            await offlineDB.saveInvitations(offlineInvitations);
          }
          break;
        }
        default:
          console.warn(`Unknown entity type for local storage: ${entityType}`);
      }
    } catch (error) {
      console.error(`Failed to store ${entityType} locally:`, error);
    }
  }

  /**
   * Update local data with server response
   */
  private async updateLocalData(data: Record<string, unknown>, entityType: string): Promise<void> {
    try {
      // Update the local data with server response (e.g., generated IDs, timestamps)
      await this.storeLocally(data, entityType);
    } catch (error) {
      console.error(`Failed to update local ${entityType} data:`, error);
    }
  }

  /**
   * Get priority for sync queue items
   */
  private getPriority(entityType: string, operation: 'create' | 'update' | 'delete'): 'low' | 'normal' | 'high' | 'critical' {
    // Critical operations
    if (entityType === 'submissions' || operation === 'delete') {
      return 'critical';
    }
    
    // High priority operations
    if (entityType === 'assessments' || entityType === 'responses') {
      return 'high';
    }
    
    // Normal priority for most operations
    return 'normal';
  }

  /**
   * Process the sync queue when online
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    try {
      // Scan questions table for pending items
      const allQuestions = await offlineDB.getAllQuestions();
      const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');

      for (const question of pendingQuestions) {
        try {
          
          // Skip if this is a temporary question that might have already been processed
          if (question.question_id.startsWith('temp_')) {
          }
          
          // Create the request data from the offline question
          const questionData = {
            category: question.category,
            text: question.latest_revision.text,
            weight: question.latest_revision.weight
          };

          const { QuestionsService } = await import('@/openapi-rq/requests/services.gen');
          const response = await QuestionsService.postQuestions({ requestBody: questionData });
          
          if (response && typeof response === 'object' && 'question' in response) {
            const realQuestion = (response as { question: { question_id: string } }).question;
            const realQuestionId = realQuestion.question_id;
            
            // Delete the temporary question first
            await offlineDB.deleteQuestion(question.question_id);
            
            // Check if a question with the same category and text already exists (to prevent duplicates)
            const existingQuestions = await offlineDB.getAllQuestions();
            const duplicateQuestion = existingQuestions.find(q => 
              q.category === question.category && 
              q.latest_revision.text.en === question.latest_revision.text.en &&
              q.question_id !== question.question_id
            );
            if (duplicateQuestion) {
              console.warn('⚠️ Found duplicate question, deleting:', duplicateQuestion.question_id);
              await offlineDB.deleteQuestion(duplicateQuestion.question_id);
            }
            
          }
        } catch (error) {
          console.error(`❌ Failed to sync question ${question.question_id}:`, error);
        }
      }

      // Scan categories table for pending items
      const allCategories = await offlineDB.getAllCategories();
      const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');

      for (const category of pendingCategories) {
        try {
          
          // Skip if this is a temporary category that might have already been processed
          if (category.category_id.startsWith('temp_')) {
          }
          
          // Create the request data from the offline category
          const categoryData = {
            name: category.name,
            weight: category.weight,
            order: category.order,
            template_id: category.template_id
          };

          const { CategoriesService } = await import('@/openapi-rq/requests/services.gen');
          const response = await CategoriesService.postCategories({ requestBody: categoryData });
          
          if (response && typeof response === 'object' && 'category' in response) {
            const realCategory = (response as { category: { category_id: string } }).category;
            const realCategoryId = realCategory.category_id;
            
            // Delete the temporary category first
            await offlineDB.deleteCategory(category.category_id);
            
            // Check if a category with the same name already exists (to prevent duplicates)
            const existingCategories = await offlineDB.getAllCategories();
            const duplicateCategory = existingCategories.find(c => 
              c.name === category.name && c.category_id !== category.category_id
            );
            if (duplicateCategory) {
              console.warn('⚠️ Found duplicate category, deleting:', duplicateCategory.category_id);
              await offlineDB.deleteCategory(duplicateCategory.category_id);
            }
            
          }
        } catch (error) {
          console.error(`❌ Failed to sync category ${category.category_id}:`, error);
        }
      }

      // Scan users table for pending items
      const allUsers = await offlineDB.getAllUsers();
      const pendingUsers = allUsers.filter(u => u.sync_status === 'pending');

      for (const user of pendingUsers) {
        try {
          
          // Skip if this is a temporary user that might have already been processed
          if (user.id.startsWith('temp_')) {
          }
          
          // Create the request data from the offline user
          const userData: OrgAdminMemberRequest = {
            email: user.email,
            roles: user.roles || ['Org_User'],
            categories: [] // Default empty categories
          };

          const { OrganizationMembersService } = await import('@/openapi-rq/requests/services.gen');
          const response = await OrganizationMembersService.postOrganizationsByIdOrgAdminMembers({
            id: user.organization_id,
            requestBody: userData
          });
          
          if (response && typeof response === 'object' && 'id' in response) {
            const realUserId = (response as { id: string }).id;
            
            // Delete the temporary user first
            await offlineDB.deleteUser(user.id);
            
            // Verify deletion by checking if user still exists
            const deletedUser = await offlineDB.getUser(user.id);
            if (deletedUser) {
              console.error('❌ Failed to delete temporary user:', user.id);
              // Try to delete again
              await offlineDB.deleteUser(user.id);
            } else {
            }
            
            // Check if a user with the same email already exists (to prevent duplicates)
            const existingUsers = await offlineDB.getAllUsers();
            const duplicateUser = existingUsers.find(u => u.email === user.email && u.id !== user.id);
            if (duplicateUser) {
              console.warn('⚠️ Found duplicate user with same email, deleting:', duplicateUser.id);
              await offlineDB.deleteUser(duplicateUser.id);
            }
            
            // Save the real user with proper ID
            const realUser = {
              id: realUserId,
              email: user.email,
              username: user.username,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              emailVerified: user.emailVerified || false,
              roles: user.roles || ['Org_User'],
              organization_id: user.organization_id,
              updated_at: new Date().toISOString(),
              sync_status: 'synced' as const,
              local_changes: false,
              last_synced: new Date().toISOString()
            };
            await offlineDB.saveUser(realUser);
            
          }
        } catch (error) {
          console.error(`❌ Failed to sync user ${user.id}:`, error);
        }
      }

      // Scan responses table for pending items
      const allResponses = await offlineDB.getResponsesWithFilters({});
      const pendingResponses = allResponses.filter(r => r.sync_status === 'pending');

      // Group responses by assessment for batch processing
      const responsesByAssessment = new Map<string, typeof pendingResponses>();
      for (const response of pendingResponses) {
        const assessmentId = response.assessment_id;
        if (!responsesByAssessment.has(assessmentId)) {
          responsesByAssessment.set(assessmentId, []);
        }
        responsesByAssessment.get(assessmentId)!.push(response);
      }

      for (const [assessmentId, responses] of responsesByAssessment) {
        try {
          
          // Convert offline responses to API format
          const apiResponses = responses.map(response => ({
            question_revision_id: response.question_revision_id,
            response: response.response,
            version: response.version
          }));

          const { ResponsesService } = await import('@/openapi-rq/requests/services.gen');
          const response = await ResponsesService.postAssessmentsByAssessmentIdResponses({ 
            assessmentId, 
            requestBody: apiResponses 
          });
          
          if (response && typeof response === 'object' && 'responses' in response) {
            // Delete the temporary responses
            for (const tempResponse of responses) {
              await offlineDB.deleteResponse(tempResponse.response_id);
            }
            
          }
        } catch (error) {
          console.error(`❌ Failed to sync responses for assessment ${assessmentId}:`, error);
        }
      }

      // Scan submissions table for pending items
      const allSubmissions = await offlineDB.getAllSubmissions();
      const pendingSubmissions = allSubmissions.filter(s => s.sync_status === 'pending');

      for (const submission of pendingSubmissions) {
        try {
          
          // Skip if this is a temporary submission that might have already been processed
          if (submission.submission_id.startsWith('temp_')) {
          }
          
          const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
          const response = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ 
            assessmentId: submission.assessment_id 
          });
          
          if (response && typeof response === 'object' && 'submission' in response) {
            const realSubmission = (response as { submission: { submission_id: string } }).submission;
            const realSubmissionId = realSubmission.submission_id;
            
            // Delete the temporary submission first
            await offlineDB.deleteSubmission(submission.submission_id);
            
            // Check if a submission with the same assessment already exists (to prevent duplicates)
            const existingSubmissions = await offlineDB.getAllSubmissions();
            const duplicateSubmission = existingSubmissions.find(s => 
              s.assessment_id === submission.assessment_id && s.submission_id !== submission.submission_id
            );
            if (duplicateSubmission) {
              console.warn('⚠️ Found duplicate submission, deleting:', duplicateSubmission.submission_id);
              await offlineDB.deleteSubmission(duplicateSubmission.submission_id);
            }
            
          }
        } catch (error) {
          console.error(`❌ Failed to sync submission ${submission.submission_id}:`, error);
        }
      }

      // Provide summary feedback
      if (successCount > 0 || failureCount > 0) {
        if (successCount > 0) {
          toast.success(`Synced ${successCount} items successfully`);
        }
        if (failureCount > 0) {
          toast.error(`Failed to sync ${failureCount} items`);
        }
      } else {
      }
    } catch (error) {
      console.error('Failed to process sync:', error);
      toast.error('Sync failed. Please try again.');
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InterceptorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): InterceptorConfig {
    return { ...this.config };
  }

  /**
   * Manually trigger sync (for testing)
   */
  async manualSync(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Get sync queue status
   */
  async getSyncStatus(): Promise<{ queueLength: number; isOnline: boolean }> {
    // Instead of checking sync queue, check pending items in tables
    const allQuestions = await offlineDB.getAllQuestions();
    const allCategories = await offlineDB.getAllCategories();
    const allOrganizations = await offlineDB.getAllOrganizations();
    const allUsers = await offlineDB.getAllUsers();
    const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');
    const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');
    const pendingOrganizations = allOrganizations.filter(o => o.sync_status === 'pending');
    const pendingUsers = allUsers.filter(u => u.sync_status === 'pending');
    const totalPending = pendingQuestions.length + pendingCategories.length + pendingOrganizations.length + pendingUsers.length;
    
    return {
      queueLength: totalPending,
      isOnline: this.isOnline
    };
  }
}

// Create a singleton instance
export const apiInterceptor = new ApiInterceptor();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { apiInterceptor: ApiInterceptor; manualSync: () => Promise<void>; getSyncStatus: () => Promise<{ queueLength: number; isOnline: boolean }>; processQueue: () => Promise<void> }).apiInterceptor = apiInterceptor;
  (window as unknown as { manualSync: () => Promise<void> }).manualSync = () => apiInterceptor.manualSync();
  (window as unknown as { getSyncStatus: () => Promise<{ queueLength: number; isOnline: boolean }> }).getSyncStatus = () => apiInterceptor.getSyncStatus();
  (window as unknown as { processQueue: () => Promise<void> }).processQueue = () => apiInterceptor.processQueue();
}

// Export convenience functions for common operations
export const interceptGet = apiInterceptor.interceptGet.bind(apiInterceptor);
export const interceptMutation = apiInterceptor.interceptMutation.bind(apiInterceptor);
export const processQueue = apiInterceptor.processQueue.bind(apiInterceptor);
export const manualSync = apiInterceptor.manualSync.bind(apiInterceptor);
export const getSyncStatus = apiInterceptor.getSyncStatus.bind(apiInterceptor); 