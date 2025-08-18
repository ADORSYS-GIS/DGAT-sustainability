# Offline Functionality Documentation - DGAT Sustainability Tool

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Flow & Strategy](#data-flow--strategy)
5. [File Structure & Responsibilities](#file-structure--responsibilities)
6. [Use Cases & Scenarios](#use-cases--scenarios)
7. [Technical Implementation](#technical-implementation)
8. [Architecture Diagrams](#architecture-diagrams)
9. [Configuration & Setup](#configuration--setup)
10. [Testing & Validation](#testing--validation)
11. [Troubleshooting](#troubleshooting)

---

## Executive Summary

The DGAT Sustainability Tool implements a comprehensive **offline-first architecture** that enables users to perform all assessment activities without internet connectivity. The system provides seamless data synchronization, robust conflict resolution, and real-time status feedback to ensure a consistent user experience regardless of network conditions.

### Key Features

- **Offline-First Data Access**: All data operations prioritize local storage
- **Background Synchronization**: Automatic sync when connectivity is restored
- **Conflict Resolution**: Last-write-wins strategy for data conflicts
- **Real-time Status**: Visual indicators for sync status and network connectivity
- **Queue Persistence**: Offline operations survive browser restarts
- **Role-Based Data Loading**: Initial data pull based on user permissions

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  IndexedDB      │    │   Backend API   │
│   Components    │◄──►│  (Local Cache)  │◄──►│   (Server DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│  Sync Service   │◄─────────────┘
                        │  (Queue Mgmt)   │
                        └─────────────────┘
```

### Core Principles

1. **Single Source of Truth**: IndexedDB serves as the primary data source for all components
2. **Immediate Persistence**: All user actions are stored locally first
3. **Background Processing**: Network operations happen transparently in the background
4. **Graceful Degradation**: Full functionality available offline
5. **Automatic Recovery**: Seamless transition between online/offline states

---

## Core Components

### 1. Enhanced IndexedDB Schema (`frontend/src/services/indexeddb.ts`)

#### Database Structure

The offline database stores all essential data types required for the sustainability assessment tool:

- **Core Data**: Questions, categories, assessments, responses
- **User Data**: Submissions, reports, user profiles
- **Admin Data**: Organizations, users, invitations
- **System Data**: Sync queue, status tracking, conflicts

#### Object Stores

```typescript
interface OfflineDatabaseSchema {
  questions: { key: string; value: OfflineQuestion };
  categories: { key: string; value: OfflineCategory };
  assessments: { key: string; value: OfflineAssessment };
  responses: { key: string; value: OfflineResponse };
  submissions: { key: string; value: OfflineSubmission };
  reports: { key: string; value: OfflineReport };
  organizations: { key: string; value: OfflineOrganization };
  users: { key: string; value: OfflineUser };
  invitations: { key: string; value: OfflineInvitation };
  sync_queue: { key: string; value: SyncQueueItem };
  sync_status: { key: string; value: SyncStatus };
  network_status: { key: string; value: NetworkStatus };
  conflicts: { key: string; value: ConflictData };
  loading_progress: { key: string; value: DataLoadingProgress };
  database_stats: { key: string; value: DatabaseStats };
}
```

#### Key Features

- **Version Management**: Database version 3 with migration support
- **Indexed Queries**: Efficient data retrieval with multiple indexes
- **Sync Status Tracking**: Each record tracks its synchronization state
- **Conflict Detection**: Version tracking for conflict resolution

### 2. API Interceptor Service (`frontend/src/services/apiInterceptor.ts`)

#### Purpose

Provides transparent offline-first behavior by intercepting all API calls and routing them through IndexedDB first.

#### Key Methods

```typescript
class ApiInterceptor {
  // Routes GET requests through IndexedDB first, then API
  async interceptGet<T>(
    apiCall: () => Promise<T>,
    offlineFallback: () => Promise<T>,
    entityType: string,
  ): Promise<T>;

  // Stores mutations locally first, then syncs to API
  async interceptMutation<T, V>(
    mutationFn: (variables: V) => Promise<T>,
    variables: V,
    entityType: string,
    priority: SyncPriority = "normal",
  ): Promise<T>;

  // Background sync processing when online
  async processQueue(): Promise<void>;
}
```

#### Network Status Monitoring

- **Online Detection**: Automatic sync when connection is restored
- **Offline Handling**: Queue operations for later sync
- **User Notifications**: Toast messages for status changes
- **Debounced Processing**: Prevents multiple rapid sync attempts

### 3. Sync Service (`frontend/src/services/syncService.ts`)

#### Purpose

Handles bidirectional synchronization between server and local IndexedDB, ensuring data consistency.

#### Sync Strategies

```typescript
interface SyncResult {
  entityType: string;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
}

interface FullSyncResult {
  questions: SyncResult;
  categories: SyncResult;
  assessments: SyncResult;
  responses: SyncResult;
  submissions: SyncResult;
  reports: SyncResult;
  organizations: SyncResult;
  users: SyncResult;
}
```

#### Role-Based Sync

- **DGRV Admin**: Syncs all data including organizations and users
- **Org Admin**: Syncs organization-specific data
- **Regular User**: Syncs only user-specific data

### 4. Initial Data Loader (`frontend/src/services/initialDataLoader.ts`)

#### Purpose

Handles role-based data loading on login with progress tracking and error handling.

#### Loading Configuration

```typescript
interface LoadingConfig {
  loadQuestions: boolean; // All users
  loadCategories: boolean; // All users
  loadAssessments: boolean; // Org admin & users
  loadResponses: boolean; // Org admin & users
  loadSubmissions: boolean; // Org admin & users
  loadReports: boolean; // Org admin & users
  loadOrganizations: boolean; // DGRV admin only
  loadUsers: boolean; // DGRV admin & org admin
}
```

#### Progress Tracking

- **Real-time Progress**: Updates during data loading
- **Error Handling**: Graceful failure with retry options
- **User Feedback**: Progress indicators and status messages

### 5. Data Transformation Service (`frontend/src/services/dataTransformation.ts`)

#### Purpose

Converts API data to offline format for IndexedDB storage and vice versa.

#### Transformation Methods

```typescript
class DataTransformationService {
  static transformQuestion(question: Question): OfflineQuestion;
  static transformCategory(category: Category): OfflineCategory;
  static transformAssessment(assessment: Assessment): OfflineAssessment;
  static transformResponse(response: Response): OfflineResponse;
  static transformSubmission(submission: Submission): OfflineSubmission;
  static transformReport(report: Report): OfflineReport;
  static transformOrganization(org: Organization): OfflineOrganization;
  static transformUser(user: OrganizationMember): OfflineUser;
}
```

#### Key Features

- **Data Normalization**: Consistent data structure across entities
- **Sync Status**: Adds offline-specific metadata
- **Version Tracking**: Maintains data version for conflict resolution
- **Relationship Mapping**: Preserves data relationships in offline format

### 6. Offline API Hooks (`frontend/src/hooks/useOfflineApi.ts`)

#### Purpose

Provides React hooks for offline-first data operations using the API interceptor.

#### Available Hooks

```typescript
// Data retrieval hooks
export function useOfflineQuestions();
export function useOfflineCategories();
export function useOfflineAssessments();
export function useOfflineAssessment(assessmentId: string);
export function useOfflineResponses(assessmentId: string);
export function useOfflineSubmissions();
export function useOfflineReports();
export function useOfflineOrganizations();
export function useOfflineUsers();

// Data mutation hooks
export function useOfflineQuestionsMutation();
export function useOfflineCategoriesMutation();
export function useOfflineAssessmentsMutation();
export function useOfflineResponsesMutation();
export function useOfflineSubmissionsMutation();
export function useOfflineReportsMutation();
export function useOfflineOrganizationsMutation();
export function useOfflineUsersMutation();
```

#### Features

- **Transparent API Integration**: Uses existing OpenAPI-generated methods
- **Error Handling**: Comprehensive error handling and loading states
- **Cache Invalidation**: Automatic cache updates after mutations
- **Optimistic Updates**: Immediate UI updates with background sync

### 7. Service Worker (`frontend/src/sw.ts`)

#### Purpose

Provides PWA capabilities and offline caching for static assets and API responses.

#### Caching Strategies

```typescript
// Navigation requests - Network First with fallback
new NetworkFirst({
  cacheName: "navigation-cache",
  networkTimeoutSeconds: 3,
});

// API requests - Network First with cache fallback
new NetworkFirst({
  cacheName: "api-cache",
  networkTimeoutSeconds: 10,
});

// Static assets - Cache First
new CacheFirst({
  cacheName: "static-assets",
});
```

#### Features

- **Progressive Web App**: Enables PWA installation
- **Offline Fallback**: Provides offline page when no cache available
- **Background Sync**: Queues failed requests for later processing
- **Cache Management**: Automatic cache cleanup and updates

### 8. Sync Status Components

#### Sync Status Hook (`frontend/src/hooks/shared/useSyncStatus.ts`)

```typescript
export const useSyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Returns { isOnline: boolean }
};
```

#### Sync Status Indicator (`frontend/src/components/shared/SyncStatusIndicator.tsx`)

- **Visual Indicator**: Shows online/offline status
- **Real-time Updates**: Updates when network status changes
- **User Feedback**: Clear visual indication of connectivity

---

## Data Flow & Strategy

### 1. Data Loading Flow

```
User Login → Role Detection → Initial Data Load → IndexedDB Population → UI Ready
     │              │              │                    │              │
     │              │              │                    │              └── User can work offline
     │              │              │                    └── All data available locally
     │              │              └── Progress tracking with user feedback
     │              └── Determines what data to load
     └── Triggers data loading process
```

### 2. Data Access Flow

```
Component Request → API Interceptor → IndexedDB Check → Return Data
     │                    │                │              │
     │                    │                │              └── Immediate response
     │                    │                └── Local data available
     │                    └── Routes through offline layer
     └── Component makes data request
```

### 3. Data Mutation Flow

```
User Action → Local Storage → Queue Operation → Background Sync → Server Update
     │            │              │                │              │
     │            │              │                │              └── Server updated
     │            │              │                └── When online
     │            │              └── For later sync
     │            └── Immediate persistence
     └── User performs action
```

### 4. Sync Strategy

#### Priority-Based Queue

```typescript
type SyncPriority = "critical" | "high" | "normal" | "low";

interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  entityType: string;
  data: any;
  priority: SyncPriority;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
}
```

#### Retry Logic

- **Exponential Backoff**: Increasing delays between retry attempts
- **Max Retries**: Configurable retry limits per operation
- **Priority Processing**: Critical operations processed first
- **Error Handling**: Failed operations logged for manual review

---

## File Structure & Responsibilities

### Core Services (`frontend/src/services/`)

| File                    | Purpose              | Key Responsibilities                           |
| ----------------------- | -------------------- | ---------------------------------------------- |
| `indexeddb.ts`          | Database management  | Schema definition, CRUD operations, migrations |
| `apiInterceptor.ts`     | Request interception | Offline-first routing, queue management        |
| `syncService.ts`        | Data synchronization | Bidirectional sync, conflict resolution        |
| `initialDataLoader.ts`  | Initial data loading | Role-based loading, progress tracking          |
| `dataTransformation.ts` | Data conversion      | API ↔ Offline format conversion               |

### Hooks (`frontend/src/hooks/`)

| File                      | Purpose           | Key Responsibilities               |
| ------------------------- | ----------------- | ---------------------------------- |
| `useOfflineApi.ts`        | Offline API hooks | React hooks for offline operations |
| `useOfflineQuery.ts`      | Query hooks       | Offline-first query handling       |
| `useOfflineLocal.ts`      | Local data hooks  | Direct IndexedDB access            |
| `useInitialDataLoad.ts`   | Data loading hook | Initial data loading with progress |
| `shared/useSyncStatus.ts` | Status monitoring | Network status tracking            |

### Components (`frontend/src/components/shared/`)

| File                      | Purpose           | Key Responsibilities               |
| ------------------------- | ----------------- | ---------------------------------- |
| `SyncStatusIndicator.tsx` | Status display    | Visual network status indicator    |
| `LoadingSpinner.tsx`      | Loading indicator | Progress display during operations |

### Types (`frontend/src/types/`)

| File         | Purpose          | Key Responsibilities                 |
| ------------ | ---------------- | ------------------------------------ |
| `offline.ts` | Type definitions | All offline-related TypeScript types |

### Service Worker (`frontend/src/`)

| File    | Purpose       | Key Responsibilities               |
| ------- | ------------- | ---------------------------------- |
| `sw.ts` | PWA & caching | Service worker for offline support |

---

## Use Cases & Scenarios

### Scenario 1: User Takes Assessment Offline

#### Flow

1. **User starts assessment** while online
2. **Data loads** into IndexedDB (questions, categories)
3. **User goes offline** during assessment
4. **Assessment continues** seamlessly offline
5. **Responses saved** locally with sync status
6. **User comes online** later
7. **Background sync** processes all responses
8. **Assessment completed** successfully

#### Technical Details

```typescript
// User starts assessment
const { data: questions } = useOfflineQuestions();
const { mutate: saveResponse } = useOfflineResponsesMutation();

// User answers question (works offline)
saveResponse({
  assessment_id: "assessment-123",
  question_revision_id: "question-456",
  answer: "Yes",
  percentage: 75,
});

// Response is immediately saved locally and queued for sync
```

### Scenario 2: Admin Manages Categories Offline

#### Flow

1. **Admin logs in** and data loads (categories, questions)
2. **Admin goes offline** and creates new category
3. **Category saved** locally with pending sync status
4. **Admin edits existing** category offline
5. **Changes queued** for background sync
6. **Admin comes online** and syncs automatically
7. **All changes** synchronized to server

#### Technical Details

```typescript
// Admin creates category offline
const { mutate: createCategory } = useOfflineCategoriesMutation();

createCategory({
  name: "New Category",
  description: "Category description",
  template_id: "template-123",
});

// Category immediately available locally, queued for sync
```

### Scenario 3: Conflict Resolution

#### Flow

1. **User edits assessment** offline
2. **Another user edits** same assessment online
3. **User comes online** and syncs
4. **Conflict detected** by version mismatch
5. **Last-write-wins** strategy applied
6. **User notified** of conflict resolution
7. **Data synchronized** successfully

#### Technical Details

```typescript
// Conflict detection in sync service
const localVersion = localAssessment.version;
const serverVersion = serverAssessment.version;

if (localVersion < serverVersion) {
  // Conflict detected - apply last-write-wins
  await offlineDB.saveAssessment(serverAssessment);
  toast.warning("Assessment updated with latest changes from server");
}
```

### Scenario 4: Initial Data Loading

#### Flow

1. **User logs in** with specific role
2. **System determines** required data based on role
3. **Data loading starts** with progress tracking
4. **Questions and categories** loaded first
5. **Role-specific data** loaded (assessments, users, etc.)
6. **Loading progress** displayed to user
7. **All data available** offline

#### Technical Details

```typescript
// Role-based loading configuration
const config = InitialDataLoader.getLoadingConfig({
  userId: "user-123",
  roles: ["org_admin"],
  organizationId: "org-456",
});

// Loads: questions, categories, assessments, responses, submissions, reports, users
// Skips: organizations (DGRV admin only)
```

---

## Technical Implementation

### 1. Database Schema Design

#### IndexedDB Object Stores

```typescript
// Questions store with indexes
const questionsStore = db.createObjectStore("questions", {
  keyPath: "question_id",
});
questionsStore.createIndex("category", "category", { unique: false });
questionsStore.createIndex("sync_status", "sync_status", { unique: false });
questionsStore.createIndex("updated_at", "updated_at", { unique: false });

// Assessments store with indexes
const assessmentsStore = db.createObjectStore("assessments", {
  keyPath: "assessment_id",
});
assessmentsStore.createIndex("organization_id", "organization_id", {
  unique: false,
});
assessmentsStore.createIndex("user_id", "user_id", { unique: false });
assessmentsStore.createIndex("status", "status", { unique: false });
```

#### Data Models

```typescript
interface OfflineQuestion {
  question_id: string;
  category: string;
  latest_revision: QuestionRevision;
  revisions: QuestionRevision[];
  category_id: string;
  created_at: string;
  updated_at: string;
  sync_status: "synced" | "pending" | "error";
  local_changes: boolean;
  last_synced: string;
  version: number;
}
```

### 2. Sync Queue Management

#### Queue Structure

```typescript
interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  entityType: string;
  data: any;
  priority: SyncPriority;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}
```

#### Queue Processing

```typescript
async processQueue(): Promise<void> {
  const queue = await offlineDB.getSyncQueue();
  const sortedQueue = queue.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  for (const item of sortedQueue) {
    try {
      await this.processQueueItem(item);
      await offlineDB.removeFromSyncQueue(item.id);
    } catch (error) {
      item.retryCount++;
      if (item.retryCount >= item.maxRetries) {
        await offlineDB.moveToConflicts(item);
      } else {
        await offlineDB.updateSyncQueueItem(item);
      }
    }
  }
}
```

### 3. Network Status Monitoring

#### Event Listeners

```typescript
private setupNetworkListeners(): void {
  window.addEventListener('online', () => {
    this.isOnline = true;
    this.debouncedProcessQueue();
    syncService.performFullSync();
    toast.success('Connection restored. Syncing data...');
  });

  window.addEventListener('offline', () => {
    this.isOnline = false;
    toast.warning('You are now offline. Changes will be synced when connection is restored.');
  });
}
```

### 4. Error Handling & Recovery

#### Retry Logic

```typescript
const retryWithBackoff = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<any> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
```

#### Conflict Resolution

```typescript
private async resolveConflict(
  localData: any,
  serverData: any,
  entityType: string
): Promise<any> {
  // Last-write-wins strategy
  if (new Date(localData.updated_at) > new Date(serverData.updated_at)) {
    return localData;
  } else {
    return serverData;
  }
}
```

---

## Architecture Diagrams

### 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Application                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   React     │  │   React     │  │   React     │            │
│  │ Components  │  │   Hooks     │  │   Router    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    Offline Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   API       │  │   Sync      │  │   Data      │            │
│  │Interceptor  │  │  Service    │  │Transformation│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    Data Layer                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ IndexedDB   │  │   Sync      │  │   Network   │            │
│  │   Cache     │  │   Queue     │  │   Status    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Questions  │  │ Assessments │  │   Users     │            │
│  │    API      │  │     API     │  │     API     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Component  │    │   Hook      │
│  Action     │───►│  Request    │───►│  Call       │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   API       │    │ IndexedDB   │    │   Network   │
│Interceptor  │◄──►│   Check     │◄──►│   Request   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Queue     │    │   Local     │    │   Server    │
│ Operation   │    │   Data      │    │  Response   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Background  │    │   UI        │    │   Cache     │
│   Sync      │    │  Update     │    │  Update     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 3. Sync Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Sync Process                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Queue     │  │   Priority  │  │   Retry     │            │
│  │  Check      │──►│  Sorting    │──►│   Logic    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   API       │  │   Conflict  │  │   Success   │            │
│  │   Call      │──►│ Resolution  │──►│  Handling  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Local     │  │   Queue     │  │   User      │            │
│  │   Update    │  │   Cleanup   │  │ Notification│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration & Setup

### 1. Environment Configuration

#### Vite Configuration (`frontend/vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [
    react(),
    // PWA plugin for service worker
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
```

#### React Query Configuration (`frontend/src/main.tsx`)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: () => navigator.onLine,
      refetchOnReconnect: true,
    },
  },
});
```

### 2. Service Worker Registration

#### Registration Logic

```typescript
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered successfully:", registration);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}
```

### 3. Database Initialization

#### Database Setup

```typescript
const offlineDB = new OfflineDB();
export { offlineDB };

// Initialize on app start
offlineDB.initialize().catch(console.error);
```

---

## Testing & Validation

### 1. Unit Testing

#### Test Structure

```typescript
// Example test for offline functionality
describe("OfflineDB", () => {
  beforeEach(async () => {
    await offlineDB.clearAll();
  });

  it("should save and retrieve questions", async () => {
    const question = createMockQuestion();
    await offlineDB.saveQuestion(question);

    const retrieved = await offlineDB.getQuestion(question.question_id);
    expect(retrieved).toEqual(question);
  });
});
```

#### Test Coverage Areas

- **Database Operations**: CRUD operations for all entity types
- **Sync Logic**: Queue processing and conflict resolution
- **Network Handling**: Online/offline state transitions
- **Data Transformation**: API ↔ Offline format conversion
- **Error Handling**: Retry logic and error recovery

### 2. Integration Testing

#### Test Scenarios

1. **Complete Offline Workflow**: User performs full assessment offline
2. **Sync Process**: Data synchronization after coming online
3. **Conflict Resolution**: Handling concurrent modifications
4. **Data Loading**: Initial data loading for different user roles
5. **Error Recovery**: Handling network failures and recovery

### 3. Performance Testing

#### Metrics

- **Database Performance**: Query response times
- **Sync Performance**: Time to sync large datasets
- **Memory Usage**: IndexedDB storage utilization
- **Network Efficiency**: API call optimization

---

## Troubleshooting

### 1. Common Issues

#### Database Connection Issues

```typescript
// Check database status
const stats = await offlineDB.getDatabaseStats();
console.log("Database size:", stats.total_size_bytes);
console.log("Last updated:", stats.last_updated);
```

#### Sync Queue Issues

```typescript
// Check sync queue status
const queue = await offlineDB.getSyncQueue();
console.log("Pending operations:", queue.length);

const conflicts = await offlineDB.getConflicts();
console.log("Conflicts:", conflicts.length);
```

#### Network Status Issues

```typescript
// Check network status
const { isOnline } = useSyncStatus();
console.log("Network status:", isOnline);

// Check sync status
const syncStatus = await offlineDB.getSyncStatus();
console.log("Last sync:", syncStatus.last_sync);
```

### 2. Debug Tools

#### Browser DevTools

- **Application Tab**: IndexedDB inspection
- **Network Tab**: API call monitoring
- **Console**: Error logging and debugging

#### Custom Debug Utilities

```typescript
// Debug utility functions
export const debugOffline = {
  async logDatabaseState() {
    const stats = await offlineDB.getDatabaseStats();
    const queue = await offlineDB.getSyncQueue();
    console.log("Database State:", { stats, queue });
  },

  async logSyncStatus() {
    const status = await offlineDB.getSyncStatus();
    console.log("Sync Status:", status);
  },
};
```

### 3. Recovery Procedures

#### Database Reset

```typescript
// Complete database reset (use with caution)
await offlineDB.clearAll();
await offlineDB.initialize();
```

#### Sync Reset

```typescript
// Reset sync state
await offlineDB.clearSyncQueue();
await offlineDB.resetSyncStatus();
```

#### Conflict Resolution

```typescript
// Manual conflict resolution
const conflicts = await offlineDB.getConflicts();
for (const conflict of conflicts) {
  // Manual resolution logic
  await offlineDB.resolveConflict(conflict.id, conflict.resolution);
}
```

---

## Conclusion

The offline functionality implementation in the DGAT Sustainability Tool provides a robust, user-friendly offline-first experience. The architecture ensures data consistency, handles network interruptions gracefully, and provides clear feedback to users about system status.

### Key Achievements

- **Complete Offline Functionality**: All assessment activities work offline
- **Seamless Synchronization**: Background sync with conflict resolution
- **Role-Based Data Management**: Efficient data loading based on user permissions
- **Robust Error Handling**: Comprehensive error recovery and user feedback
- **Performance Optimization**: Efficient data storage and retrieval

### Future Enhancements

- **Advanced Conflict Resolution**: User-driven conflict resolution
- **Data Compression**: Optimize storage usage for large datasets
- **Background Sync API**: Leverage service worker background sync
- **Offline Analytics**: Track offline usage patterns
- **Multi-Device Sync**: Cross-device data synchronization

This implementation provides a solid foundation for offline-first functionality while maintaining system reliability and user experience.
