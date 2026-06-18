// API Interceptor Service
// Provides transparent offline-first behavior by intercepting API calls
// and routing them through IndexedDB first
// Uses existing OpenAPI-generated methods from @openapi-rq/requests/services.gen

import { offlineDB } from "./indexeddb";
import { toast } from "sonner";
import i18n from "@/i18n";
import { refreshToken } from "./shared/authService";
import type { OfflineQuestion, SyncQueueItem, OfflineOrganization, OfflineDraftSubmission, SyncableEntityType } from "@/types/offline";
import { DataTransformationService } from "./dataTransformation";
import { syncService } from "./syncService";
import type {
  Question,
  QuestionRevision,
  CategoryCatalog,
  Submission,
  Assessment,
  Response,
  Report,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateCategoryCatalogRequest,
  UpdateCategoryCatalogRequest,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  CreateResponseRequest,
  UpdateResponseRequest,
  OrgAdminMemberRequest,
  OrgAdminMemberCategoryUpdateRequest,
  OrganizationCreateRequest,
  AdminSubmissionDetail
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
  private inFlightGets = new Map<string, Promise<Record<string, unknown>>>();
  private recentGets = new Map<string, { timestamp: number; data: Record<string, unknown> }>();
  private readonly recentGetTtlMs = 10_000;

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

      toast.success(i18n.t('connection.restored'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      toast.warning(i18n.t('connection.offline'));
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
    const cacheKey = `${entityType}:${entityId || "list"}`;
    const recent = this.recentGets.get(cacheKey);
    if (recent && Date.now() - recent.timestamp < this.recentGetTtlMs) {
      return recent.data as T;
    }

    const inFlight = this.inFlightGets.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    const requestPromise = this.executeGet(apiCall, localGet, entityType, entityId, cacheKey);
    this.inFlightGets.set(cacheKey, requestPromise as Promise<Record<string, unknown>>);

    try {
      return await requestPromise;
    } finally {
      this.inFlightGets.delete(cacheKey);
    }
  }

  invalidateRecentGet(entityType: string, entityId?: string): void {
    const cacheKey = `${entityType}:${entityId || "list"}`;
    this.recentGets.delete(cacheKey);
  }

  private async executeGet<T extends Record<string, unknown>>(
    apiCall: () => Promise<T>,
    localGet: () => Promise<T | null>,
    entityType: string,
    entityId: string | undefined,
    cacheKey: string
  ): Promise<T> {
    try {
      // Try API call first if online
      if (this.isOnline) {
        try {
          console.log(`🔍 interceptGet: Making API call for ${entityType}`);
          console.log(`🔍 interceptGet: About to call apiCall() function`);
          const result = await apiCall();
          console.log(`🔍 interceptGet: API call successful for ${entityType}:`, result);

          // Filter out items that are marked for deletion in the sync queue
          let processedResult = result;
          if (entityType === 'draft_assessments' || entityType === 'assessments') {
            const syncQueue = await offlineDB.getSyncQueue();
            const pendingDeletes = new Set(
              syncQueue
                .filter(item => item.entity_type === 'assessment' && item.operation === 'delete')
                .map(item => item.entity_id)
            );

            if (pendingDeletes.size > 0 && result.assessments && Array.isArray(result.assessments)) {
              console.log(`🔍 interceptGet: Filtering ${pendingDeletes.size} pending deletes from result`);
              processedResult = {
                ...result,
                assessments: (result.assessments as Assessment[]).filter(
                  a => !pendingDeletes.has(a.assessment_id)
                )
              };
            }
          } else if (entityType === 'category_catalogs') {
            const syncQueue = await offlineDB.getSyncQueue();
            const pendingDeletes = new Set(
              syncQueue
                .filter(item => item.entity_type === 'category_catalog' && item.operation === 'delete')
                .map(item => item.entity_id)
            );

            if (pendingDeletes.size > 0 && result.category_catalogs && Array.isArray(result.category_catalogs)) {
              console.log(`🔍 interceptGet: Filtering ${pendingDeletes.size} pending category deletes from result`);
              processedResult = {
                ...result,
                category_catalogs: (result.category_catalogs as CategoryCatalog[]).filter(
                  category => !pendingDeletes.has(category.category_catalog_id)
                )
              };
            }
          }

          // Merge with local pending changes before returning and storing
          const mergedResult = await this.mergePendingChanges(processedResult, entityType, entityId);
          await this.storeLocally(mergedResult, entityType);
          this.recentGets.set(cacheKey, { timestamp: Date.now(), data: mergedResult });
          return mergedResult;
        } catch (apiError) {
          console.warn(`API call failed for ${entityType}, falling back to local data:`, apiError);
        }
      }

      // Fall back to local data
      const localData = await localGet();
      if (localData) {
        this.recentGets.set(cacheKey, { timestamp: Date.now(), data: localData });
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
  async interceptMutation<T extends Record<string, unknown> | void>(
    apiCall: () => Promise<T>,
    localMutation: (data: Record<string, unknown>) => Promise<void>,
    data: Record<string, unknown>,
    entityType: string,
    operation: 'create' | 'update' | 'delete' | 'submit'
  ): Promise<T> {
    console.log(`[Interceptor] 1. Intercepting mutation for entity: ${entityType}, operation: ${operation}`);
    try {
      console.log('[Interceptor] 2. Executing local mutation.');
      await localMutation(data);
      console.log('[Interceptor] 3. Local mutation completed successfully. Dispatching optimistic sync event.');

      // Dispatch an optimistic sync event immediately after local mutation to provide instant UI updates
      window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType, operation, optimistic: true } }));

      if (this.isOnline) {
        console.log('[Interceptor] 4a. [Online] Attempting API call.');
        try {
          const result = await apiCall();
          console.log('[Interceptor] 5a. [Online] API call successful. Result:', result);
          if (operation === 'delete') {
            await this.deleteLocalData(data, entityType);
          } else {
            await this.updateLocalData(result, entityType);
          }

          // After a successful online creation or update, we must remove the local temporary record or draft
          if (operation === 'create' || operation === 'update') {
            let tempId: string | undefined;
            if (entityType === 'category_catalog' && 'category_catalog_id' in data && typeof data.category_catalog_id === 'string') {
              tempId = data.category_catalog_id;
            } else if (entityType === 'question' && 'question_id' in data && typeof data.question_id === 'string') {
              tempId = data.question_id;
            } else if (entityType === 'organization' && 'id' in data && typeof data.id === 'string') {
              tempId = data.id;
            } else if (entityType === 'submission' && 'submission_id' in data && typeof data.submission_id === 'string') {
              tempId = data.submission_id;
            }

            if (tempId && tempId.startsWith('temp-')) {
              if (entityType === 'category_catalog') {
                await offlineDB.deleteCategoryCatalog(tempId);
              } else if (entityType === 'question') {
                await offlineDB.deleteQuestion(tempId);
              } else if (entityType === 'organization') {
                await offlineDB.deleteOrganization(tempId);
              } else if (entityType === 'submission') {
                await offlineDB.deleteDraftSubmission(tempId); // Delete from drafts if it was a draft
              }
            }
          }

          // Notify the UI that data has changed
          window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType } }));

          return result;
        } catch (apiError) {
          console.warn(`[Interceptor] 5b. [Online] API call failed. Queuing for later sync. Error:`, apiError);
          if (this.config.enableQueueing) {
            await this.addToSyncQueue(data, entityType, operation);
          }
          // Even if the API fails, we resolve with a mock success object to unblock the UI.
          // The queue will handle the retry.
          return { success: true, offline: true, ...data } as unknown as T;
        }
      } else {
        console.log('[Interceptor] 4b. [Offline] Queuing mutation for later sync.');
        if (this.config.enableQueueing) {
          await this.addToSyncQueue(data, entityType, operation);
        }
        // When offline, we immediately resolve with a mock success object.
        // This is crucial for react-query's onSuccess to fire.
        return { success: true, offline: true, ...data } as unknown as T;
      }
    } catch (error) {
      console.error(`[Interceptor] Critical error during mutation interception for ${entityType}:`, error);
      throw error; // Re-throw critical errors.
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
            const categories = await offlineDB.getAllCategoryCatalogs();
            const categoryNameToIdMap = new Map<string, string>();
            categories.forEach(cat => {
              if (cat.name && cat.category_catalog_id) {
                categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
              }
            });
            const incomingQuestions = data.questions as Question[];

            // Delete questions from local DB that are not in the API response
            // (meaning they were soft-deleted/inactivated on the server), unless pending sync
            const localQuestions = await offlineDB.getAllQuestions(true);
            const incomingIds = new Set(incomingQuestions.map(q => q.question_id));
            const questionsToDelete = localQuestions
              .filter(q => q.sync_status !== 'pending' && !incomingIds.has(q.question_id))
              .map(q => q.question_id);

            for (const id of questionsToDelete) {
              await offlineDB.deleteQuestion(id);
            }

            for (const question of incomingQuestions) {
              const offlineQuestion = DataTransformationService.transformQuestion(question, categoryNameToIdMap);
              await offlineDB.saveQuestion(offlineQuestion);
            }
          }
          break;
        case 'question':
          if (data && typeof data === 'object') {
            const questionData = (data.question || data) as Question;
            const categories = await offlineDB.getAllCategoryCatalogs();
            const categoryNameToIdMap = new Map<string, string>();
            categories.forEach(cat => {
              if (cat.name && cat.category_catalog_id) {
                categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
              }
            });
            const offlineQuestion = DataTransformationService.transformQuestion(questionData, categoryNameToIdMap);
            await offlineDB.saveQuestion(offlineQuestion);
          }
          break;
        case 'category_catalogs':
          if (data.category_catalogs && Array.isArray(data.category_catalogs)) {
            const incomingCatalogs = (data.category_catalogs as CategoryCatalog[]).filter(
              (catalog) =>
                catalog.is_active !== false &&
                typeof catalog.name === 'string' &&
                catalog.name.trim().length > 0
            );
            const incomingIds = new Set(incomingCatalogs.map((catalog) => catalog.category_catalog_id));
            const localCatalogs = await offlineDB.getAllCategoryCatalogs();

            for (const localCatalog of localCatalogs) {
              if (
                localCatalog.sync_status !== 'pending' &&
                localCatalog.category_catalog_id &&
                !incomingIds.has(localCatalog.category_catalog_id)
              ) {
                await offlineDB.deleteCategoryCatalog(localCatalog.category_catalog_id);
                await offlineDB.deleteOrganizationCategoriesByCategoryCatalog(localCatalog.category_catalog_id);
                await offlineDB.deleteQuestionsByCategory(localCatalog.category_catalog_id);
              }
            }

            for (const catalog of incomingCatalogs) {
              const offlineCatalog = DataTransformationService.transformCategoryCatalog(catalog);
              await offlineDB.saveCategoryCatalog(offlineCatalog);
            }
          }
          break;
        case 'category_catalog':
          if (data && typeof data === 'object' && 'category_catalog' in data) {
            const catalog = data.category_catalog as unknown as CategoryCatalog;
            if (
              catalog.is_active !== false &&
              typeof catalog.name === 'string' &&
              catalog.name.trim().length > 0
            ) {
              const offlineCatalog = DataTransformationService.transformCategoryCatalog(catalog);
              await offlineDB.saveCategoryCatalog(offlineCatalog);
            }
          } else if (
            data &&
            typeof data.category_catalog_id === 'string' &&
            typeof data.name === 'string' &&
            data.name.trim().length > 0 &&
            data.is_active !== false
          ) {
            const offlineCatalog = DataTransformationService.transformCategoryCatalog(data as unknown as CategoryCatalog);
            await offlineDB.saveCategoryCatalog(offlineCatalog);
          }
          break;
        case 'assessments':
        case 'draft_assessments': {
          const isDraftOnly = entityType === 'draft_assessments';
          const assessmentsToProcess = Array.isArray(data.assessments)
            ? data.assessments as Assessment[]
            : (data.assessment ? [data.assessment as Assessment] : []);

          if (assessmentsToProcess.length > 0 || isDraftOnly) {
            const syncQueue = await offlineDB.getSyncQueue();
            const pendingDeletes = new Set(
              syncQueue
                .filter(item => item.entity_type === 'assessment' && item.operation === 'delete')
                .map(item => item.entity_id)
            );

            const categories = await offlineDB.getAllCategoryCatalogs();
            const categoryIdToCategoryMap = new Map(
              categories.map(cat => [cat.category_catalog_id, cat])
            );

            if (isDraftOnly) {
              const localDrafts = await offlineDB.getAssessmentsByStatus('draft');
              // Only delete local drafts that are NOT pending sync
              const draftIdsToDelete = localDrafts
                .filter(a => a.sync_status !== 'pending')
                .map(a => a.assessment_id);
              await offlineDB.deleteAssessments(draftIdsToDelete);
            }

            for (const assessment of assessmentsToProcess) {
              // Skip if there's a pending delete for this assessment
              if (pendingDeletes.has(assessment.assessment_id)) {
                console.log(`🔍 storeLocally: Skipping assessment ${assessment.assessment_id} due to pending delete`);
                continue;
              }

              const offlineAssessment = DataTransformationService.transformAssessment(assessment, categoryIdToCategoryMap);

              // Only overwrite if not pending sync locally
              const existing = await offlineDB.getAssessment(assessment.assessment_id);
              if (!existing || existing.sync_status !== 'pending') {
                await offlineDB.saveAssessment(offlineAssessment);
              }
            }
          }

          // Also cache responses if this is an AssessmentDetailResponse (single assessment detail)
          if (data.responses && Array.isArray(data.responses)) {
            for (const response of data.responses as Response[]) {
              const existing = await offlineDB.getResponse(response.response_id);
              if (!existing || existing.sync_status !== 'pending') {
                const offlineResponse = DataTransformationService.transformResponse(response);
                await offlineDB.saveResponse(offlineResponse);
              }
            }
          }
          break;
        }
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
        case 'admin_submissions':
          // Handle admin submissions - these are transformed and stored as regular submissions
          if (data.submissions && Array.isArray(data.submissions)) {
            const assessments = await offlineDB.getAllAssessments();
            const transformedSubmissions = DataTransformationService.transformAdminSubmissionsWithContext(
              data.submissions as AdminSubmissionDetail[],
              assessments
            );
            for (const submission of transformedSubmissions) {
              await offlineDB.saveSubmission(submission);
            }
          }
          break;
        case 'drafts_endpoint':
          // Handle draft submissions from the /drafts endpoint
          if (data.draft_submissions && Array.isArray(data.draft_submissions)) {
            for (const draftSubmission of data.draft_submissions as Submission[]) {
              const offlineDraftSubmission = DataTransformationService.transformSubmissionToDraft(draftSubmission);
              await offlineDB.saveDraftSubmission(offlineDraftSubmission);
            }
          }
          break;
        case 'draft_submission':
          // Handle individual draft submission creation
          if (data.submission) {
            const offlineDraftSubmission = DataTransformationService.transformSubmissionToDraft(data.submission as Submission);
            await offlineDB.saveDraftSubmission(offlineDraftSubmission);
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
        case 'action-plans':
          if (data.organizations && Array.isArray(data.organizations)) {
            for (const org of data.organizations as { organization_id: string; recommendations: unknown[] }[]) {
              if (org.recommendations && Array.isArray(org.recommendations)) {
                // This is not ideal, we are receiving recommendations, not submissions.
                // This part of the backend may need to be updated to return submissions.
                // For now, we can't properly store this data as submissions.
                console.warn(`Received recommendations for organization ${org.organization_id}, but expected submissions.`);
              }
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
   * Merge pending local changes with server response to prevent overwriting unsynced work
   */
  private async mergePendingChanges<T extends Record<string, unknown>>(
    serverData: T,
    entityType: string,
    entityId?: string
  ): Promise<T> {
    try {
      if (entityType === 'responses' && entityId) {
        // Query IndexedDB for responses that are pending for this assessment
        const localResponses = await offlineDB.getResponsesByAssessment(entityId);
        const pendingResponses = localResponses.filter(r => r.sync_status === 'pending');

        if (pendingResponses.length > 0 && serverData.responses && Array.isArray(serverData.responses)) {
          console.log(`🔍 merging ${pendingResponses.length} pending local responses into server results for assessment ${entityId}`);

          // Use question_revision_id as the unique key to merge
          const serverResponsesMap = new Map(
            (serverData.responses as Response[]).map(r => [r.question_revision_id, r])
          );

          // Overlay pending responses
          for (const pending of pendingResponses) {
            serverResponsesMap.set(pending.question_revision_id, pending as unknown as Response);
          }

          return {
            ...serverData,
            responses: Array.from(serverResponsesMap.values())
          } as T;
        }
      }

      // Merge pending assessment changes
      if ((entityType === 'assessments' || entityType === 'draft_assessments') && serverData.assessments && Array.isArray(serverData.assessments)) {
        const localAssessments = await offlineDB.getAllAssessments();
        const pendingAssessments = localAssessments.filter(a => a.sync_status === 'pending');

        if (pendingAssessments.length > 0) {
          console.log(`🔍 merging ${pendingAssessments.length} pending local assessments into server results`);

          const serverAssessmentsMap = new Map(
            (serverData.assessments as Assessment[]).map(a => [a.assessment_id, a])
          );

          // Overlay pending assessments
          for (const pending of pendingAssessments) {
            // Transform OfflineAssessment back to Assessment for API compatibility if needed
            const assessmentForApi = {
              ...pending,
              categories: pending.categories?.map(c => c.category_catalog_id) || [],
            } as unknown as Assessment;

            serverAssessmentsMap.set(pending.assessment_id, assessmentForApi);
          }

          return {
            ...serverData,
            assessments: Array.from(serverAssessmentsMap.values())
          } as T;
        }
      }

      return serverData;
    } catch (error) {
      console.warn(`Failed to merge pending changes for ${entityType}:`, error);
      return serverData;
    }
  }

  /**
   * Update local data with server response
   */
  private async updateLocalData(data: Record<string, unknown> | void, entityType: string): Promise<void> {
    // This method is called when we get a successful API response
    // We can use it to update local data with the server response
    if (data) {
      await this.storeLocally(data as Record<string, unknown>, entityType);
    }
  }

  private async deleteLocalData(data: Record<string, unknown>, entityType: string): Promise<void> {
    if (entityType === 'category_catalog' && typeof data.category_catalog_id === 'string') {
      await offlineDB.deleteCategoryCatalog(data.category_catalog_id);
      await offlineDB.deleteOrganizationCategoriesByCategoryCatalog(data.category_catalog_id);
      await offlineDB.deleteQuestionsByCategory(data.category_catalog_id);
    } else if (entityType === 'question' && typeof data.question_id === 'string') {
      await offlineDB.deleteQuestion(data.question_id);
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(data: Record<string, unknown>, entityType: string, operation: 'create' | 'update' | 'delete' | 'submit'): Promise<void> {
    try {
      let entityId: string | undefined;
      if (entityType === 'draft_submission' && 'submission_id' in data && typeof data.submission_id === 'string') {
        entityId = data.submission_id;
      } else if (entityType === 'draft_submission' && 'assessmentId' in data && typeof data.assessmentId === 'string') {
        entityId = data.assessmentId;
      } else if (entityType === 'submission' && 'submission_id' in data && typeof data.submission_id === 'string') {
        entityId = data.submission_id;
      } else if (entityType === 'submission' && 'assessmentId' in data && typeof data.assessmentId === 'string') {
        entityId = data.assessmentId;
      } else if (entityType === 'assessment' && 'assessment_id' in data && typeof data.assessment_id === 'string') {
        entityId = data.assessment_id;
      } else if (entityType === 'question' && 'question_id' in data && typeof data.question_id === 'string') {
        entityId = data.question_id;
      } else if (entityType === 'category_catalog' && 'category_catalog_id' in data && typeof data.category_catalog_id === 'string') {
        entityId = data.category_catalog_id;
      } else if (entityType === 'organization' && 'id' in data && typeof data.id === 'string') {
        entityId = data.id;
      } else if ((entityType === 'response' || entityType === 'responses') && 'response_id' in data && typeof data.response_id === 'string') {
        entityId = data.response_id;
      } else if ((entityType === 'response' || entityType === 'responses') && 'assessmentId' in data && typeof data.assessmentId === 'string') {
        // Batch response create — use assessmentId as the grouping key
        entityId = data.assessmentId as string;
      }

      const queueItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        entity_type: (
          entityType === 'drafts_endpoint' ? 'submission' :
            (entityType === 'responses' ? 'response' : entityType)
        ) as SyncableEntityType,
        entity_id: entityId, // Explicitly set entity_id
        operation,
        data,
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
        priority: this.getPriority(entityType, operation)
      };

      await offlineDB.addToSyncQueue(queueItem);
      window.dispatchEvent(new CustomEvent('sync-queue-updated'));
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
    }
  }

  /**
   * Get priority for sync queue item
   */
  private getPriority(entityType: string, operation: 'create' | 'update' | 'delete' | 'submit'): 'low' | 'normal' | 'high' | 'critical' {
    // Critical: submissions (user data)
    if (entityType === 'submissions' || entityType === 'drafts_endpoint' || entityType === 'draft_submission') return 'critical';

    // High: assessments, responses (user work)
    if (entityType === 'assessments' || entityType === 'responses') return 'high';

    // Normal: questions, category_catalogs (reference data)
    if (entityType === 'questions' || entityType === 'category_catalogs') return 'normal';

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
      // Ensure we have a fresh token before replaying mutations
      await refreshToken();
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
            category_id: question.category_id,
            text: question.latest_revision.text,
            weight: question.latest_revision.weight,
            display_order: (question as any).display_order || 0
          };

          const { QuestionService } = await import('@/openapi-rq/requests/services.gen');
          const response = await QuestionService.postQuestions({ requestBody: questionData });

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


      // Scan assessments table for pending items
      // This is now handled by syncService.syncPendingAssessments

      // Scan responses table for pending items
      const allResponses = await offlineDB.getResponsesWithFilters({});

      // Clean up invalid responses before processing
      const invalidResponses = allResponses.filter(r => !r.assessment_id || r.assessment_id.trim() === '');
      if (invalidResponses.length > 0) {
        console.warn(`🧹 Found ${invalidResponses.length} responses with empty assessment_id, cleaning up...`);
        for (const invalidResponse of invalidResponses) {
          console.warn(`🧹 Deleting invalid response: ${invalidResponse.response_id}`);
          await offlineDB.deleteResponse(invalidResponse.response_id);
        }
      }

      const pendingResponses = allResponses.filter(r => r.sync_status === 'pending' && r.assessment_id && r.assessment_id.trim() !== '');

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

          // For submissions, we need to submit the assessment
          const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
          const apiResponse = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({
            assessmentId: submission.assessment_id
          });

          if (apiResponse && typeof apiResponse === 'object' && 'submission' in apiResponse) {
            const realSubmission = (apiResponse as { submission: Submission }).submission;

            // Update the local submission with the synced data
            const updatedLocalSubmission = {
              ...submission,
              ...realSubmission, // Merge properties from the real submission
              sync_status: 'synced' as const,
              updated_at: new Date().toISOString(),
            };
            await offlineDB.saveSubmission(updatedLocalSubmission);

            // If the real submission has a different ID than the local one, and the local one was a temporary ID,
            // then delete the temporary one. This scenario is less likely for approvals, but good to handle.
            if (submission.submission_id.startsWith('temp_') && realSubmission.submission_id !== submission.submission_id) {
              await offlineDB.deleteSubmission(submission.submission_id);
            }

            // Invalidate queries to reflect the change
            window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: 'submission' } }));

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
          toast.success(i18n.t('offline.syncedSuccessfully', { count: successCount }));
        }

        if (failureCount > 0) {
          toast.error(i18n.t('offline.syncFailed', { count: failureCount }));
        }
      }

      // Process sync queue items (for report generation and other queued operations)
      const syncQueue = await offlineDB.getSyncQueue();
      console.log(`🔄 Processing ${syncQueue.length} sync queue items`);

      for (const queueItem of syncQueue) {
        try {
          console.log(`🔄 Processing sync queue item: ${queueItem.entity_type} - ${queueItem.operation} - ID: ${queueItem.id}`);

          if (queueItem.entity_type === 'report' && queueItem.operation === 'create') {
            const reviewData = queueItem.data as { submission_id: string; recommendation: string; status: 'approved' | 'rejected'; reviewer: string };
            const submissionId = reviewData.submission_id;

            // Check if this submission has already been processed
            if (this.processedSubmissions.has(submissionId)) {
              console.log(`⚠️ Submission ${submissionId} already processed, skipping...`);
              await offlineDB.removeFromSyncQueue(queueItem.id);
              continue;
            }

            // Handle report generation
            const { ReportsService } = await import('@/openapi-rq/requests/services.gen');
            const recommendationsArray = JSON.parse(reviewData.recommendation) as { id: string; category: string; recommendation: string; timestamp: string }[];
            const requestBody = recommendationsArray.map(rec => ({
              category: rec.category,
              recommendation: rec.recommendation,
              recommendation_id: rec.id, // Use existing ID or generate new one
            }));

            const result = await ReportsService.postSubmissionsBySubmissionIdReports({
              submissionId: submissionId,
              requestBody: requestBody,
            });

            console.log(`✅ Report generation successful: ${result.report_id}`);

            // Update the local submission status
            const originalSubmission = await offlineDB.getSubmission(submissionId);
            if (originalSubmission) {
              const updatedLocalSubmission = {
                ...originalSubmission,
                review_status: reviewData.status,
                reviewed_at: new Date().toISOString(),
                review_comments: reviewData.recommendation,
                sync_status: 'synced' as const,
              };
              await offlineDB.saveSubmission(updatedLocalSubmission);
              console.log(`✅ Updated local submission ${submissionId} with review status: ${reviewData.status}`);
            } else {
              console.warn(`⚠️ Original submission ${submissionId} not found in local DB after report generation.`);
            }

            // Remove the pending review submission from IndexedDB
            const pendingReviews = await offlineDB.getAllPendingReviewSubmissions();
            const matchingPendingReview = pendingReviews.find(pr => pr.submission_id === submissionId && pr.status === reviewData.status && pr.recommendation === reviewData.recommendation);
            if (matchingPendingReview) {
              await offlineDB.deletePendingReviewSubmission(matchingPendingReview.id);
              console.log(`✅ Deleted pending review submission ${matchingPendingReview.id} for submission ${submissionId}`);
            } else {
              console.warn(`⚠️ No matching pending review submission found for submission ${submissionId} after report generation.`);
            }

            // Mark this submission as processed
            this.processedSubmissions.add(submissionId);
          } else if (queueItem.entity_type === 'response') {
            const { ResponsesService } = await import('@/openapi-rq/requests/services.gen');
            const assessmentId = queueItem.entity_id;

            if (!assessmentId) {
              console.error(`[processQueue] No assessment_id for response sycn queue item: ${queueItem.id}`);
            } else {
              // Extract response data from the queue item
              const responseData = Array.isArray(queueItem.data) ? queueItem.data : [queueItem.data];

              // Map to the format expected by the API
              const formattedResponses = responseData.map((r: any) => ({
                question_revision_id: r.question_revision_id,
                response: r.response
              }));

              await ResponsesService.postAssessmentsByAssessmentIdResponses({
                assessmentId,
                requestBody: formattedResponses
              });

              // Clean up any local responses that were temporary
              for (const r of responseData) {
                if (r.response_id && r.response_id.startsWith('temp_')) {
                  await offlineDB.deleteResponse(r.response_id);
                }
              }

              console.log(`✅ Synced ${formattedResponses.length} responses for assessment ${assessmentId}`);
              successCount++;
            }
          } else if (queueItem.entity_type === 'category_catalog') {
            const { CategoryCatalogService } = await import('@/openapi-rq/requests/services.gen');
            const categoryData = queueItem.data as CategoryCatalog;

            if (queueItem.operation === 'create') {
              const requestBody: CreateCategoryCatalogRequest = {
                name: categoryData.name,
                description: categoryData.description,
                template_id: categoryData.template_id,
                is_active: categoryData.is_active,
              };
              const result = await CategoryCatalogService.postCategoryCatalog({ requestBody });
              if (result && result.category_catalog) {
                await offlineDB.deleteCategoryCatalog(categoryData.category_catalog_id!);
                const newOfflineCatalog = DataTransformationService.transformCategoryCatalog(result.category_catalog);
                await offlineDB.saveCategoryCatalog(newOfflineCatalog);
              }
            } else if (queueItem.operation === 'update') {
              const requestBody: UpdateCategoryCatalogRequest = {
                name: categoryData.name,
                description: categoryData.description,
                is_active: categoryData.is_active,
              };
              const result = await CategoryCatalogService.putCategoryCatalogByCategoryCatalogId({
                categoryCatalogId: categoryData.category_catalog_id!,
                requestBody,
              });
              if (result && result.category_catalog) {
                const updatedOfflineCatalog = DataTransformationService.transformCategoryCatalog(result.category_catalog);
                await offlineDB.saveCategoryCatalog(updatedOfflineCatalog);
              }
            } else if (queueItem.operation === 'delete') {
              await CategoryCatalogService.deleteCategoryCatalogByCategoryCatalogId({
                categoryCatalogId: categoryData.category_catalog_id!,
              });
            }
          } else if (queueItem.entity_type === 'question') {
            const { QuestionService } = await import('@/openapi-rq/requests/services.gen');
            const questionData = queueItem.data as OfflineQuestion;

            if (queueItem.operation === 'create') {
              const requestBody: CreateQuestionRequest = {
                category_id: questionData.category_id,
                text: questionData.latest_revision.text,
                weight: questionData.latest_revision.weight,
              };
              const result = await QuestionService.postQuestions({ requestBody });
              if (result && result.question) {
                await offlineDB.deleteQuestion(questionData.question_id);
                const categories = await offlineDB.getAllCategoryCatalogs();
                const categoryNameToIdMap = new Map<string, string>();
                categories.forEach(cat => {
                  if (cat.name && cat.category_catalog_id) {
                    categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
                  }
                });
                const newOfflineQuestion = DataTransformationService.transformQuestion(result.question, categoryNameToIdMap);
                await offlineDB.saveQuestion(newOfflineQuestion);
              }
            } else if (queueItem.operation === 'update') {
              const requestBody: UpdateQuestionRequest = {
                category_id: questionData.category_id,
                text: questionData.latest_revision.text,
                weight: questionData.latest_revision.weight,
              };
              const result = await QuestionService.putQuestionsByQuestionId({
                questionId: questionData.question_id,
                requestBody,
              });
              if (result && result.question) {
                const categories = await offlineDB.getAllCategoryCatalogs();
                const categoryNameToIdMap = new Map<string, string>();
                categories.forEach(cat => {
                  if (cat.name && cat.category_catalog_id) {
                    categoryNameToIdMap.set(cat.name.toLowerCase(), cat.category_catalog_id);
                  }
                });
                const updatedOfflineQuestion = DataTransformationService.transformQuestion(result.question, categoryNameToIdMap);
                await offlineDB.saveQuestion(updatedOfflineQuestion);
              }
            } else if (queueItem.operation === 'delete') {
              await QuestionService.deleteQuestionsRevisionsByQuestionRevisionId({
                questionRevisionId: questionData.latest_revision.question_revision_id,
              });
            }
          } else if (queueItem.entity_type === 'organization') {
            const { OrganizationsService } = await import('@/openapi-rq/requests/services.gen');
            const organizationData = queueItem.data as OfflineOrganization;


            if (queueItem.operation === 'create') {
              const requestBody: OrganizationCreateRequest = {
                name: organizationData.name,
                domains: organizationData.domains.map(name => ({ name })),
                redirectUrl: organizationData.redirectUrl || 'http://localhost:3000',
                enabled: organizationData.is_active ? 'true' : 'false',
                attributes: (organizationData.attributes as Record<string, string[]> | undefined),
              };
              const result = await OrganizationsService.postAdminOrganizations({ requestBody });
              if (result && result.id) {
                await offlineDB.deleteOrganization(organizationData.organization_id!);
                const newOfflineOrganization = DataTransformationService.transformOrganization(result as Organization);
                await offlineDB.saveOrganization(newOfflineOrganization);
              }
            } else if (queueItem.operation === 'update') {
              const requestBody: OrganizationCreateRequest = {
                name: organizationData.name,
                domains: organizationData.domains.map(name => ({ name })),
                redirectUrl: organizationData.redirectUrl || 'http://localhost:3000',
                enabled: organizationData.is_active ? 'true' : 'false',
                attributes: (organizationData.attributes as Record<string, string[]> | undefined),
              };
              await OrganizationsService.putAdminOrganizationsById({
                id: organizationData.organization_id!,
                requestBody,
              });
              await offlineDB.saveOrganization(organizationData);
            } else if (queueItem.operation === 'delete') {
              await OrganizationsService.deleteAdminOrganizationsById({
                id: organizationData.organization_id!,
              });
            }
          } else if (queueItem.entity_type === 'submission' && queueItem.operation === 'update') {
            const submissionData = queueItem.data as { assessmentId: string; submissionId: string };
            const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
            const apiResponse = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({
              assessmentId: submissionData.assessmentId
            });

            if (apiResponse && typeof apiResponse === 'object' && 'submission' in apiResponse) {
              const realSubmission = (apiResponse as { submission: Submission }).submission;

              // Fetch the original submission from IndexedDB to update its status
              const originalSubmission = await offlineDB.getSubmission(submissionData.submissionId);
              if (originalSubmission) {
                const updatedLocalSubmission = {
                  ...originalSubmission,
                  ...realSubmission, // Merge properties from the real submission
                  sync_status: 'synced' as const,
                  review_status: 'approved' as const, // Ensure review_status is set to approved
                  updated_at: new Date().toISOString(),
                };
                await offlineDB.saveSubmission(updatedLocalSubmission);
              } else {
                console.warn(`⚠️ Original submission ${submissionData.submissionId} not found in local DB during sync queue processing.`);
              }
            }
          } else if (queueItem.entity_type === 'submission' && queueItem.operation === 'submit') {
            // User submitting an assessment for admin approval (draft endpoint)
            const submitData = queueItem.data as { assessmentId?: string; tempId?: string };
            const assessmentId = submitData?.assessmentId || queueItem.entity_id;
            if (!assessmentId) {
              console.error(`[processQueue] No assessmentId for draft submission queue item: ${queueItem.id}`);
            } else {
              const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
              const apiResponse = await AssessmentsService.postAssessmentsByAssessmentIdDraft({ assessmentId });

              // If the API returns the created submission, store it as a synced draft submission
              if (apiResponse && typeof apiResponse === 'object' && 'submission' in apiResponse) {
                const realSubmission = (apiResponse as { submission: Submission }).submission;
                const offlineDraftSubmission = DataTransformationService.transformSubmissionToDraft(realSubmission) as OfflineDraftSubmission;
                offlineDraftSubmission.review_status = 'pending_review';
                offlineDraftSubmission.sync_status = 'synced';
                await offlineDB.saveDraftSubmission(offlineDraftSubmission);
              }

              // Clean up the temp submission + temp draft submission
              if (submitData?.tempId) {
                await offlineDB.deleteSubmission(submitData.tempId);
                await offlineDB.deleteDraftSubmission(submitData.tempId);
              }
              successCount++;
            }
          } else if (queueItem.entity_type === 'draft_submission' && queueItem.operation === 'submit') {
            const draftSubmissionData = queueItem.data as OfflineDraftSubmission;
            try {
              const { AssessmentsService } = await import('@/openapi-rq/requests/services.gen');
              const apiResponse = await AssessmentsService.postAssessmentsByAssessmentIdSubmit({
                assessmentId: draftSubmissionData.assessment_id
              });

              if (apiResponse && typeof apiResponse === 'object' && 'submission' in apiResponse) {
                const realSubmission = (apiResponse as { submission: Submission }).submission;

                await offlineDB.deleteDraftSubmission(draftSubmissionData.submission_id);
                console.log(`✅ Deleted draft submission ${draftSubmissionData.submission_id} from drafts.`);

                const offlineSubmission = DataTransformationService.transformSubmission(realSubmission);
                await offlineDB.saveSubmission(offlineSubmission);
                console.log(`✅ Saved real submission ${realSubmission.submission_id} to submissions.`);
                successCount++;
              } else {
                throw new Error('API did not return a valid submission on draft submission.');
              }
            } catch (error) {
              console.error(`❌ Failed to submit draft submission ${draftSubmissionData.submission_id}:`, error);
              const failedDraft = await offlineDB.getDraftSubmission(draftSubmissionData.submission_id);
              if (failedDraft) {
                failedDraft.sync_status = 'failed';
                await offlineDB.saveDraftSubmission(failedDraft);
              }
              failureCount++;
            }
          }

          // Notify the UI that data has changed before removing the item from the queue
          window.dispatchEvent(new CustomEvent('datasync', { detail: { entityType: queueItem.entity_type } }));

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
      toast.error(i18n.t('offline.syncFailedRetry'));
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

      // Also clean up any responses with empty assessment_id that might have been missed
      const allResponses = await offlineDB.getResponsesWithFilters({});
      const invalidResponses = allResponses.filter(r => !r.assessment_id || r.assessment_id.trim() === '');
      if (invalidResponses.length > 0) {
        console.warn(`🧹 Found ${invalidResponses.length} additional responses with empty assessment_id, cleaning up...`);
        for (const invalidResponse of invalidResponses) {
          console.warn(`🧹 Deleting invalid response: ${invalidResponse.response_id}`);
          await offlineDB.deleteResponse(invalidResponse.response_id);
        }
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
   * Comprehensive cleanup of all invalid data
   */
  async comprehensiveCleanup(): Promise<{ deletedResponses: number; deletedSubmissions: number }> {
    console.log('🧹 Starting comprehensive cleanup...');

    // Clean up responses with empty assessment_id
    const allResponses = await offlineDB.getResponsesWithFilters({});
    const invalidResponses = allResponses.filter(r => !r.assessment_id || r.assessment_id.trim() === '');
    let deletedResponses = 0;

    for (const invalidResponse of invalidResponses) {
      console.warn(`🧹 Deleting invalid response: ${invalidResponse.response_id}`);
      await offlineDB.deleteResponse(invalidResponse.response_id);
      deletedResponses++;
    }

    // Clean up submissions with empty assessment_id
    const allSubmissions = await offlineDB.getAllSubmissions();
    const invalidSubmissions = allSubmissions.filter(s => !s.assessment_id || s.assessment_id.trim() === '');
    let deletedSubmissions = 0;

    for (const invalidSubmission of invalidSubmissions) {
      console.warn(`🧹 Deleting invalid submission: ${invalidSubmission.submission_id}`);
      await offlineDB.deleteSubmission(invalidSubmission.submission_id);
      deletedSubmissions++;
    }

    console.log(`🧹 Comprehensive cleanup completed: ${deletedResponses} responses, ${deletedSubmissions} submissions deleted`);
    return { deletedResponses, deletedSubmissions };
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

// Make debugUtils available globally for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugUtils = debugUtils;
  console.log('🔧 Debug utilities available at window.debugUtils');
  console.log('🔧 Available functions:');
  console.log('  - debugUtils.comprehensiveCleanup() - Clean up all invalid data');
  console.log('  - debugUtils.cleanupInvalidResponses() - Clean up invalid responses');
  console.log('  - debugUtils.manualSync() - Trigger manual sync');
  console.log('  - debugUtils.getSyncStatus() - Get current sync status');
} 
