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
  OrgAdminMemberCategoryUpdateRequest
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
      console.log('🌐 Network connection restored - starting auto-sync');
      
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
      console.log('📱 Network connection lost - queuing changes for later sync');
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
        const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');
        const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');
        const totalPending = pendingQuestions.length + pendingCategories.length;
        
        if (totalPending > 0) {
          console.log(`🔄 Periodic sync check found ${totalPending} pending items`);
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
        console.log(`📱 Returning local ${entityType} data`);
        return localData;
      }

      // If no local data and online, fetch from API
      if (this.isOnline) {
        console.log(`🌐 Fetching ${entityType} from API`);
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
      console.log(`💾 Stored ${entityType} locally`);

      // If online, try API call immediately
      if (this.isOnline) {
        try {
          console.log(`🌐 Syncing ${entityType} to API`);
          const result = await apiCall();
          console.log(`✅ API call successful for ${entityType}:`, result);
          
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
      console.log(`🔄 Returning request data for ${entityType} (API call failed or offline)`);
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
    console.log('🔄 processQueue called - isOnline:', this.isOnline, 'enableQueueing:', this.config.enableQueueing);
    
    if (!this.isOnline || !this.config.enableQueueing) {
      console.log('🔄 Sync skipped - offline or queueing disabled');
      return;
    }

    // Import the necessary service methods dynamically to avoid circular dependencies
    const { 
      QuestionsService,
      CategoriesService
    } = await import('@/openapi-rq/requests/services.gen');

    try {
      // Instead of using a separate sync queue, scan all tables for pending items
      console.log('🔄 Scanning tables for pending items...');
      
      let successCount = 0;
      let failureCount = 0;

      // Scan questions table for pending items
      const allQuestions = await offlineDB.getAllQuestions();
      const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');
      console.log(`🔄 Found ${pendingQuestions.length} pending questions:`, pendingQuestions.map(q => q.question_id));

      for (const question of pendingQuestions) {
        try {
          console.log(`🔄 Syncing pending question: ${question.question_id}`);
          
          // Create the request data from the offline question
          const questionData: CreateQuestionRequest = {
            category: question.category,
            text: question.latest_revision.text,
            weight: question.latest_revision.weight
          };

          const response = await QuestionsService.postQuestions({ requestBody: questionData });
          console.log('✅ Question created via API:', response);
          
          if (response && response.question) {
            const realQuestion = response.question as Question;
            
            // Delete the temporary question
            await offlineDB.deleteQuestion(question.question_id);
            console.log('🗑️ Deleted temporary question:', question.question_id);
            
            // Save the real question with proper ID
            const offlineQuestion = DataTransformationService.transformQuestion(realQuestion);
            offlineQuestion.sync_status = 'synced';
            await offlineDB.saveQuestion(offlineQuestion);
            console.log('✅ Updated local question with real ID:', realQuestion.question_id);
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync question ${question.question_id}:`, error);
          failureCount++;
        }
      }

      // Scan categories table for pending items
      const allCategories = await offlineDB.getAllCategories();
      const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');
      console.log(`🔄 Found ${pendingCategories.length} pending categories:`, pendingCategories.map(c => c.category_id));

      for (const category of pendingCategories) {
        try {
          console.log(`🔄 Syncing pending category: ${category.category_id}`);
          
          // Create the request data from the offline category
          const categoryData: CreateCategoryRequest = {
            name: category.name,
            weight: category.weight,
            order: category.order,
            template_id: category.template_id
          };

          const response = await CategoriesService.postCategories({ requestBody: categoryData });
          console.log('✅ Category created via API:', response);
          
          if (response && response.category) {
            const realCategory = response.category as Category;
            
            // Delete the temporary category
            await offlineDB.deleteCategory(category.category_id);
            console.log('🗑️ Deleted temporary category:', category.category_id);
            
            // Save the real category with proper ID
            const offlineCategory = DataTransformationService.transformCategory(realCategory);
            offlineCategory.sync_status = 'synced';
            await offlineDB.saveCategory(offlineCategory);
            console.log('✅ Updated local category with real ID:', realCategory.category_id);
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync category ${category.category_id}:`, error);
          failureCount++;
        }
      }

      // Provide summary feedback
      if (successCount > 0 || failureCount > 0) {
        console.log(`✅ Sync completed: ${successCount} successful, ${failureCount} failed`);
        if (successCount > 0) {
          toast.success(`Synced ${successCount} items successfully`);
        }
        if (failureCount > 0) {
          toast.error(`Failed to sync ${failureCount} items`);
        }
      } else {
        console.log('🔄 No pending items found to sync');
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
    console.log('🔄 Manual sync triggered');
    await this.processQueue();
  }

  /**
   * Get sync queue status
   */
  async getSyncStatus(): Promise<{ queueLength: number; isOnline: boolean }> {
    // Instead of checking sync queue, check pending items in tables
    const allQuestions = await offlineDB.getAllQuestions();
    const allCategories = await offlineDB.getAllCategories();
    const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');
    const pendingCategories = allCategories.filter(c => c.sync_status === 'pending');
    const totalPending = pendingQuestions.length + pendingCategories.length;
    
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