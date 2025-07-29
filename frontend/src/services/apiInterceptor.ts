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
  Category,
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  CreateQuestionRequest,
  CreateCategoryRequest,
  CreateAssessmentRequest,
  CreateResponseRequest,
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
      
      
      toast.success('Connection restored. Syncing data...');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Network connection lost - queuing changes for later sync');
      toast.warning('You are now offline. Changes will be synced when connection is restored.');
    });
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
          console.warn(`📋 Queuing ${entityType} for retry due to API failure`);
          // Fall through to queueing
        }
      }

      // Queue for background sync
      if (this.config.enableQueueing) {
        await this.queueForSync(data, entityType, operation);
        console.log(`📋 Queued ${entityType} for background sync`);
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
   * Queue data for background synchronization
   */
  private async queueForSync(
    data: Record<string, unknown>,
    entityType: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      entity_type: entityType as SyncQueueItem['entity_type'],
      operation,
      data,
      retry_count: 0,
      max_retries: this.config.maxRetries,
      priority: this.getPriority(entityType, operation),
      created_at: new Date().toISOString()
    };
    await offlineDB.addToSyncQueue(item);
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
    if (!this.isOnline || !this.config.enableQueueing) {
      console.log('🔄 Sync skipped - offline or queueing disabled');
      return;
    }

    try {
      const queue = await offlineDB.getSyncQueue();
      if (queue.length === 0) {
        console.log('🔄 No items in sync queue');
        return;
      }

      console.log(`🔄 Processing ${queue.length} queued items`);

      let successCount = 0;
      let failureCount = 0;

      for (const item of queue) {
        try {
          console.log(`🔄 Processing: ${item.operation} ${item.entity_type} (attempt ${item.retry_count + 1}/${item.max_retries})`);
          
          // Process the item using the appropriate service method
          await this.processQueueItem(item);
          
          // Remove from queue on success
          await offlineDB.removeFromSyncQueue(item.id);
          
          successCount++;
          console.log(`✅ Successfully synced ${item.entity_type}`);
        } catch (error) {
          console.error(`❌ Failed to sync ${item.entity_type}:`, error);
          failureCount++;
          
          // Increment retry count
          item.retry_count++;
          
          if (item.retry_count >= item.max_retries) {
            // Remove from queue if max retries exceeded
            await offlineDB.removeFromSyncQueue(item.id);
            console.error(`🚫 Max retries exceeded for ${item.entity_type}`);
          } else {
            // Update the queue item
            await offlineDB.addToSyncQueue(item);
          }
        }
      }

      // Provide summary feedback
      if (successCount > 0) {
        console.log(`✅ Sync completed: ${successCount} successful, ${failureCount} failed`);
        if (successCount > 0) {
          toast.success(`Synced ${successCount} items successfully`);
        }
        if (failureCount > 0) {
          toast.error(`Failed to sync ${failureCount} items`);
        }
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      toast.error('Sync failed. Please try again.');
    }
  }

  /**
   * Process a single queue item using service methods
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    // Import the necessary service methods dynamically to avoid circular dependencies
    const { 
      QuestionsService,
      CategoriesService,
      AssessmentsService,
      ResponsesService,
      OrganizationMembersService
    } = await import('@/openapi-rq/requests/services.gen');

    console.log(`Processing queue item: ${item.operation} ${item.entity_type}`);
    
    try {
      switch (item.entity_type) {
        case 'question':
          if (item.operation === 'create') {
            await QuestionsService.postQuestions({ requestBody: item.data as CreateQuestionRequest });
          }
          break;
        case 'category':
          if (item.operation === 'create') {
            await CategoriesService.postCategories({ requestBody: item.data as CreateCategoryRequest });
          }
          break;
        case 'assessment':
          if (item.operation === 'create') {
            await AssessmentsService.postAssessments({ requestBody: item.data as CreateAssessmentRequest });
          }
          break;
        case 'response':
          if (item.operation === 'create') {
            await ResponsesService.postAssessmentsByAssessmentIdResponses(item.data as { assessmentId: string, requestBody: CreateResponseRequest[] });
          }
          break;
        case 'submission':
          if (item.operation === 'create') {
            // Handle assessment submission
            const { assessmentId } = item.data as { assessmentId: string };
            await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ assessmentId });
          }
          break;
        case 'user':
          if (item.operation === 'create') {
            const { organizationId, userData } = item.data as { organizationId: string; userData: OrgAdminMemberRequest };
            await OrganizationMembersService.postOrganizationsByIdOrgAdminMembers({
              id: organizationId,
              requestBody: userData
            });
          } else if (item.operation === 'update') {
            const { organizationId, memberId, userData } = item.data as { organizationId: string; memberId: string; userData: OrgAdminMemberCategoryUpdateRequest };
            await OrganizationMembersService.putOrganizationsByIdOrgAdminMembersByMemberIdCategories({
              id: organizationId,
              memberId: memberId,
              requestBody: userData
            });
          } else if (item.operation === 'delete') {
            const { organizationId, memberId } = item.data as { organizationId: string; memberId: string };
            await OrganizationMembersService.deleteOrganizationsByIdOrgAdminMembersByMemberId({
              id: organizationId,
              memberId: memberId
            });
          }
          break;
        default:
          console.warn(`Unsupported entity type for queue processing: ${item.entity_type}`);
      }
    } catch (error) {
      console.error(`Failed to process queue item ${item.entity_type}:`, error);
      throw error;
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
}

// Create a singleton instance
export const apiInterceptor = new ApiInterceptor();

// Export convenience functions for common operations
export const interceptGet = apiInterceptor.interceptGet.bind(apiInterceptor);
export const interceptMutation = apiInterceptor.interceptMutation.bind(apiInterceptor);
export const processQueue = apiInterceptor.processQueue.bind(apiInterceptor); 