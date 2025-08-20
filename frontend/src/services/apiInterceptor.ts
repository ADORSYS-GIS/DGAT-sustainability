// API Interceptor Service
// Provides transparent offline-first behavior by intercepting API calls
// and routing them through IndexedDB first
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { offlineDB } from "./indexeddb";
import { toast } from "sonner";
import type { SyncQueueItem } from "@/types/offline";
import { DataTransformationService } from "./dataTransformation";
import { syncService } from "./syncService";
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
  enablePeriodicSync: boolean;
  syncInterval: number;
}

export class ApiInterceptor {
  private config: InterceptorConfig;
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;
  private isProcessingQueue: boolean = false;
  private processedSubmissions: Set<string> = new Set(); // Track processed submissions

  constructor(config: Partial<InterceptorConfig> = {}) {
    this.config = {
      enableOfflineFirst: true,
      enableQueueing: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enablePeriodicSync: true,
      syncInterval: 30000, // 30 seconds
      ...config
    };

    this.setupNetworkListeners();
    this.setupPeriodicSync();
    
    // Clean up invalid responses on startup
    this.cleanupInvalidResponses();
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      
      // Immediate sync attempt with debounce
      this.debouncedProcessQueue();
      
      // Also trigger full sync after a short delay to ensure all components are ready
      setTimeout(() => {
        syncService.performFullSync();
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
        this.debouncedProcessQueue();
        syncService.performFullSync();
      }, 2000);
    }
  }

  /**
   * Debounced process queue to prevent multiple rapid calls
   */
  private debounceTimeout: NodeJS.Timeout | null = null;
  private debouncedProcessQueue = () => {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      this.processQueue();
    }, 1000); // 1 second debounce
  };

  /**
   * Setup periodic sync check
   */
  private setupPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.config.enablePeriodicSync) {
      this.syncInterval = setInterval(async () => {
        if (this.isOnline && !syncService.isCurrentlySyncing()) {
          // Perform full sync every interval
          await syncService.performFullSync();
        }
      }, this.config.syncInterval);
    }
  }

  /**
   * Intercept GET requests with offline-first behavior
   */
  async interceptGet<T extends Record<string, unknown>>(
    apiCall: () => Promise<T>,
    localGet: () => Promise<T | null>,
    entityType: string,
    entityId?: string
  ): Promise<T> {
    console.log(`🔍 interceptGet: Starting for entityType: ${entityType}, isOnline: ${this.isOnline}`);
    try {
      // Try API call first if online
      if (this.isOnline) {
        try {
          console.log(`🔍 interceptGet: Making API call for ${entityType}`);
          console.log(`🔍 interceptGet: About to call apiCall() function`);
          const result = await apiCall();
          console.log(`🔍 interceptGet: API call successful for ${entityType}:`, result);
          console.log(`🔍 interceptGet: Result type:`, typeof result);
          console.log(`🔍 interceptGet: Result keys:`, Object.keys(result || {}));
          // Store the result locally for offline access
          await this.storeLocally(result, entityType);
          return result;
        } catch (apiError) {
          console.warn(`API call failed for ${entityType}, falling back to local data:`, apiError);
        }
      }

      // Fall back to local data
      const localData = await localGet();
      if (localData) {
        return localData;
      }

      // If no local data and offline, throw error
      throw new Error(`No local data available for ${entityType}`);
    } catch (error) {
      console.error(`Failed to get ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Intercept mutation requests (POST, PUT, DELETE) with offline-first behavior
   */
  async interceptMutation<T extends Record<string, unknown>>(
    apiCall: () => Promise<T>,
    localMutation: (data: Record<string, unknown>) => Promise<void>,
    data: Record<string, unknown>,
    entityType: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<T> {
    try {
      // Always perform local mutation first for immediate UI feedback
      await localMutation(data);

      // If online, try API call
      if (this.isOnline) {
        try {
          const result = await apiCall();
          
          // Update local data with server response
          await this.updateLocalData(result, entityType);
          
          return result;
        } catch (apiError) {
          console.warn(`API call failed for ${entityType} ${operation}, will retry later:`, apiError);
          
          // Add to sync queue for later retry
          if (this.config.enableQueueing) {
            await this.addToSyncQueue(data, entityType, operation);
          }
          
          // Return the local data as fallback
          return data as T;
        }
      } else {
        // Offline - add to sync queue
        if (this.config.enableQueueing) {
          await this.addToSyncQueue(data, entityType, operation);
        }
        
        // Return the local data
        return data as T;
      }
    } catch (error) {
      console.error(`Failed to perform ${operation} on ${entityType}:`, error);
      throw error;
    }
  }

  /**
   * Store data locally in IndexedDB
   */
  private async storeLocally(data: Record<string, unknown>, entityType: string): Promise<void> {
    try {
      switch (entityType) {
        case 'questions':
          if (data.questions && Array.isArray(data.questions)) {
            for (const question of data.questions as Question[]) {
              const offlineQuestion = DataTransformationService.transformQuestion(question);
              await offlineDB.saveQuestion(offlineQuestion);
            }
          }
          break;
        case 'categories':
          if (data.categories && Array.isArray(data.categories)) {
            for (const category of data.categories as Category[]) {
              const offlineCategory = DataTransformationService.transformCategory(category);
              await offlineDB.saveCategory(offlineCategory);
            }
          }
          break;
        case 'assessments':
          if (data.assessments && Array.isArray(data.assessments)) {
            for (const assessment of data.assessments as Assessment[]) {
              const offlineAssessment = DataTransformationService.transformAssessment(assessment);
              await offlineDB.saveAssessment(offlineAssessment);
            }
          } else if (data.assessment) {
            const offlineAssessment = DataTransformationService.transformAssessment(data.assessment as Assessment);
            await offlineDB.saveAssessment(offlineAssessment);
          }
          break;
        case 'draft_assessments':
          if (data.assessments && Array.isArray(data.assessments)) {
            for (const assessment of data.assessments as Assessment[]) {
              const offlineAssessment = DataTransformationService.transformAssessment(assessment);
              await offlineDB.saveAssessment(offlineAssessment);
            }
          } else if (data.assessment) {
            const offlineAssessment = DataTransformationService.transformAssessment(data.assessment as Assessment);
            await offlineDB.saveAssessment(offlineAssessment);
          }
          break;
        case 'responses':
          if (data.responses && Array.isArray(data.responses)) {
            for (const response of data.responses as Response[]) {
              const offlineResponse = DataTransformationService.transformResponse(response);
              await offlineDB.saveResponse(offlineResponse);
            }
          }
          break;
        case 'submissions':
          if (data.submissions && Array.isArray(data.submissions)) {
            for (const submission of data.submissions as Submission[]) {
              const offlineSubmission = DataTransformationService.transformSubmission(submission);
              await offlineDB.saveSubmission(offlineSubmission);
            }
          } else if (data.submission) {
            const offlineSubmission = DataTransformationService.transformSubmission(data.submission as Submission);
            await offlineDB.saveSubmission(offlineSubmission);
          }
          break;
        case 'drafts_endpoint':
          // Handle draft submissions from the /drafts endpoint
          if (data.draft_submissions && Array.isArray(data.draft_submissions)) {
            for (const draftSubmission of data.draft_submissions as Submission[]) {
              const offlineSubmission = DataTransformationService.transformSubmission(draftSubmission);
              await offlineDB.saveSubmission(offlineSubmission);
            }
          }
          break;
        case 'draft_submission':
          // Handle individual draft submission creation
          if (data.draft_submission) {
            const offlineSubmission = DataTransformationService.transformSubmission(data.draft_submission as Submission);
            await offlineDB.saveSubmission(offlineSubmission);
          }
          break;
        case 'reports':
          if (data.reports && Array.isArray(data.reports)) {
            for (const report of data.reports as Report[]) {
              const offlineReport = DataTransformationService.transformReport(report);
              await offlineDB.saveReport(offlineReport);
            }
          }
          break;
        case 'organizations':
          if (data.organizations && Array.isArray(data.organizations)) {
            for (const organization of data.organizations as Organization[]) {
              const offlineOrganization = DataTransformationService.transformOrganization(organization);
              await offlineDB.saveOrganization(offlineOrganization);
            }
          }
          break;
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
    // This method is called when we get a successful API response
    // We can use it to update local data with the server response
    await this.storeLocally(data, entityType);
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(data: Record<string, unknown>, entityType: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    try {
      const queueItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        entity_type: (entityType === 'drafts_endpoint' || entityType === 'draft_submission' ? 'submission' : entityType) as 'submission' | 'assessment' | 'question' | 'category' | 'response' | 'report' | 'organization' | 'user' | 'invitation',
        operation,
        data,
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        priority: this.getPriority(entityType, operation)
      };
      
      await offlineDB.addToSyncQueue(queueItem);
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
    }
  }

  /**
   * Get priority for sync queue item
   */
  private getPriority(entityType: string, operation: 'create' | 'update' | 'delete'): 'low' | 'normal' | 'high' | 'critical' {
    // Critical: submissions (user data)
    if (entityType === 'submissions' || entityType === 'drafts_endpoint' || entityType === 'draft_submission') return 'critical';
    
    // High: assessments, responses (user work)
    if (entityType === 'assessments' || entityType === 'responses') return 'high';
    
    // Normal: questions, categories (reference data)
    if (entityType === 'questions' || entityType === 'categories') return 'normal';
    
    // Low: reports, organizations (admin data)
    return 'low';
  }

  /**
   * Process sync queue (existing functionality for offline->online sync)
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    // Prevent multiple simultaneous queue processing
    if (this.isProcessingQueue) {
      console.log('🔄 Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessingQueue = true;

    try {
      let successCount = 0;
      let failureCount = 0;

      // Scan questions table for pending items
      const allQuestions = await offlineDB.getAllQuestions();
      const pendingQuestions = allQuestions.filter(q => q.sync_status === 'pending');

      for (const question of pendingQuestions) {
        try {
          
          // Skip if this is a temporary question that might have already been processed
          if (question.question_id.startsWith('temp_')) {
            continue;
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
            const duplicateQuestion = existingQuestions.find(q => {
              if (q.category !== question.category || q.question_id === question.question_id) {
                return false;
              }
              
              // Compare text in all available languages
              const qText = q.latest_revision.text;
              const questionText = question.latest_revision.text;
              
              if (typeof qText === 'object' && typeof questionText === 'object') {
                // Compare all language keys
                const qKeys = Object.keys(qText);
                const questionKeys = Object.keys(questionText);
                
                // Check if any language has the same text
                for (const key of qKeys) {
                  if (questionKeys.includes(key) && qText[key] === questionText[key]) {
                    return true;
                  }
                }
              } else if (qText === questionText) {
                return true;
              }
              
              return false;
            });
            if (duplicateQuestion) {
              console.warn('⚠️ Found duplicate question, deleting:', duplicateQuestion.question_id);
              await offlineDB.deleteQuestion(duplicateQuestion.question_id);
            }
            
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

      for (const category of pendingCategories) {
        try {
          
          // Skip if this is a temporary category that might have already been processed
          if (category.category_id.startsWith('temp_')) {
            continue;
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
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync category ${category.category_id}:`, error);
          failureCount++;
        }
      }

      // Scan assessments table for pending items
      const allAssessments = await offlineDB.getAllAssessments();
      const pendingAssessments = allAssessments.filter(a => a.sync_status === 'pending');

      for (const assessment of pendingAssessments) {
        try {
          
          // Skip if this is a temporary assessment that might have already been processed
          if (assessment.assessment_id.startsWith('temp_')) {
            continue;
          }
          
          // Create the request data from the offline assessment
          const assessmentData = {
            language: assessment.language
          };

          const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
          const response = await AssessmentsService.postAssessments({ requestBody: assessmentData });
          
          if (response && typeof response === 'object' && 'assessment' in response) {
            const realAssessment = (response as { assessment: { assessment_id: string } }).assessment;
            const realAssessmentId = realAssessment.assessment_id;
            
            // Delete the temporary assessment first
            await offlineDB.deleteAssessment(assessment.assessment_id);
            
            // Check if an assessment with the same properties already exists (to prevent duplicates)
            const existingAssessments = await offlineDB.getAllAssessments();
            const duplicateAssessment = existingAssessments.find(a => 
              a.language === assessment.language && a.assessment_id !== assessment.assessment_id
            );
            if (duplicateAssessment) {
              console.warn('⚠️ Found duplicate assessment, deleting:', duplicateAssessment.assessment_id);
              await offlineDB.deleteAssessment(duplicateAssessment.assessment_id);
            }
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync assessment ${assessment.assessment_id}:`, error);
          failureCount++;
        }
      }

      // Scan responses table for pending items
      const allResponses = await offlineDB.getResponsesWithFilters({});
      const pendingResponses = allResponses.filter(r => r.sync_status === 'pending');

      console.log(`🔄 Processing ${pendingResponses.length} pending responses`);
      
      // Log details of pending responses for debugging
      for (const response of pendingResponses) {
        console.log(`🔍 Pending response: ${response.response_id}, assessment_id: "${response.assessment_id}", sync_status: ${response.sync_status}`);
      }

      for (const response of pendingResponses) {
        try {
          
          // Skip if this is a temporary response that might have already been processed
          if (response.response_id.startsWith('temp_')) {
            continue;
          }
          
          // Create the request data from the offline response
          const responseData = {
            question_revision_id: response.question_revision_id,
            response: response.response
          };

          // Handle responses with empty assessment IDs
          if (!response.assessment_id || response.assessment_id.trim() === '') {
            console.warn('⚠️ Found response with empty assessment_id, deleting invalid response:', response.response_id);
            await offlineDB.deleteResponse(response.response_id);
            continue; // Skip this response and continue with the next one
          }

          const { ResponsesService } = await import('@/openapi-rq/requests/services.gen');
          const apiResponse = await ResponsesService.postAssessmentsByAssessmentIdResponses({ 
            assessmentId: response.assessment_id, 
            requestBody: [responseData] 
          });
          
          if (apiResponse && typeof apiResponse === 'object' && 'responses' in apiResponse) {
            const realResponses = (apiResponse as { responses: { response_id: string }[] }).responses;
            const realResponseId = realResponses[0]?.response_id;
            
            // Delete the temporary response first
            await offlineDB.deleteResponse(response.response_id);
            
            // Check if a response with the same properties already exists (to prevent duplicates)
            const existingResponses = await offlineDB.getResponsesWithFilters({});
            const duplicateResponse = existingResponses.find(r => 
              r.question_revision_id === response.question_revision_id && 
              r.assessment_id === response.assessment_id &&
              r.response_id !== response.response_id
            );
            if (duplicateResponse) {
              console.warn('⚠️ Found duplicate response, deleting:', duplicateResponse.response_id);
              await offlineDB.deleteResponse(duplicateResponse.response_id);
            }
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync response ${response.response_id}:`, error);
          failureCount++;
        }
      }

      // Scan submissions table for pending items
      const allSubmissions = await offlineDB.getAllSubmissions();
      const pendingSubmissions = allSubmissions.filter(s => s.sync_status === 'pending');

      for (const submission of pendingSubmissions) {
        try {
          
          // Skip if this is a temporary submission that might have already been processed
          if (submission.submission_id.startsWith('temp_')) {
            continue;
          }
          
          // For submissions, we need to submit the assessment
          const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
          const apiResponse = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({ 
            assessmentId: submission.assessment_id 
          });
          
          if (apiResponse && typeof apiResponse === 'object' && 'submission' in apiResponse) {
            const realSubmission = (apiResponse as { submission: { submission_id: string } }).submission;
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
            
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync submission ${submission.submission_id}:`, error);
          failureCount++;
        }
      }

      if (successCount > 0 || failureCount > 0) {
        console.log(`🔄 Sync completed: ${successCount} successful, ${failureCount} failed`);
        
        if (successCount > 0) {
          toast.success(`Synced ${successCount} items successfully`);
        }
        
        if (failureCount > 0) {
          toast.error(`${failureCount} items failed to sync`);
        }
      }

      // Process sync queue items (for report generation and other queued operations)
      const syncQueue = await offlineDB.getSyncQueue();
      console.log(`🔄 Processing ${syncQueue.length} sync queue items`);
      
      for (const queueItem of syncQueue) {
        try {
          console.log(`🔄 Processing sync queue item: ${queueItem.entity_type} - ${queueItem.operation} - ID: ${queueItem.id}`);
          
          if (queueItem.entity_type === 'report' && queueItem.operation === 'create') {
            // Check if this submission has already been processed
            const submissionId = queueItem.data.submissionId as string;
            if (this.processedSubmissions.has(submissionId)) {
              console.log(`⚠️ Submission ${submissionId} already processed, skipping...`);
              await offlineDB.removeFromSyncQueue(queueItem.id);
              continue;
            }
            
            // Handle report generation
            const { ReportsService } = await import('@/openapi-rq/requests/services.gen');
            const result = await ReportsService.postSubmissionsBySubmissionIdReports({
              submissionId: submissionId,
              requestBody: queueItem.data.categoryRecommendations as { category: string; recommendation: string }[]
            });
            
            console.log(`✅ Report generation successful: ${result.report_id}`);
            
            // Mark this submission as processed
            this.processedSubmissions.add(submissionId);
          }
          
          // Remove the processed item from the queue immediately after successful processing
          await offlineDB.removeFromSyncQueue(queueItem.id);
          console.log(`✅ Removed sync queue item: ${queueItem.id}`);
          successCount++;
          
        } catch (error) {
          console.error(`❌ Failed to process sync queue item ${queueItem.id}:`, error);
          
          // Increment retry count
          queueItem.retry_count++;
          
          if (queueItem.retry_count >= queueItem.max_retries) {
            console.error(`❌ Max retries reached for sync queue item ${queueItem.id}, removing from queue`);
            await offlineDB.removeFromSyncQueue(queueItem.id);
          }
          
          failureCount++;
        }
      }

    } catch (error) {
      console.error('❌ Failed to process sync queue:', error);
      toast.error('Sync failed. Please try again.');
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Update interceptor configuration
   */
  updateConfig(config: Partial<InterceptorConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupPeriodicSync();
  }

  /**
   * Get current configuration
   */
  getConfig(): InterceptorConfig {
    return { ...this.config };
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    await this.processQueue();
    await syncService.performFullSync();
  }

  /**
   * Manual cleanup of invalid responses
   */
  async cleanupInvalidData(): Promise<number> {
    return await offlineDB.cleanupInvalidResponses();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ queueLength: number; isOnline: boolean; isSyncing: boolean }> {
    const queue = await offlineDB.getSyncQueue();
    return {
      queueLength: queue.length,
      isOnline: this.isOnline,
      isSyncing: syncService.isCurrentlySyncing()
    };
  }

  /**
   * Clean up invalid responses on startup
   */
  private async cleanupInvalidResponses(): Promise<void> {
    try {
      const deletedCount = await offlineDB.cleanupInvalidResponses();
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} invalid responses on startup`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup invalid responses:', error);
    }
  }
}

// Export singleton instance
export const apiInterceptor = new ApiInterceptor();

// Export utility functions for debugging
export const debugUtils = {
  /**
   * Clean up invalid responses manually
   */
  async cleanupInvalidResponses(): Promise<number> {
    return await apiInterceptor.cleanupInvalidData();
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ queueLength: number; isOnline: boolean; isSyncing: boolean }> {
    return await apiInterceptor.getSyncStatus();
  },

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    await apiInterceptor.manualSync();
  }
}; 