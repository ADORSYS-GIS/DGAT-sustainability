# RxDB Migration Plan for DGAT Sustainability Tool

## Overview

This document outlines the complete migration plan from the current IndexedDB-based offline-first architecture to RxDB. The migration will simplify the codebase significantly while maintaining the same local-first behavior.

## Current Architecture Analysis

### **Files Currently Using IndexedDB** (16 files total)

#### **Core Services** (3 files)

1. `frontend/src/services/indexeddb.ts` - Main database service
2. `frontend/src/services/apiInterceptor.ts` - API interception layer
3. `frontend/src/services/syncService.ts` - Synchronization service

#### **Hooks** (4 files)

4. `frontend/src/hooks/useOfflineApi.ts` - Main business logic hooks
5. `frontend/src/hooks/useOfflineQuery.ts` - React Query integration
6. `frontend/src/hooks/useOfflineLocal.ts` - Direct database access
7. `frontend/src/hooks/useInitialDataLoad.ts` - Initial data loading

#### **Services** (1 file)

8. `frontend/src/services/initialDataLoader.ts` - Data loading orchestration

#### **Components** (8 files)

9. `frontend/src/pages/user/Assesment.tsx` - Assessment taking
10. `frontend/src/pages/user/Assessments.tsx` - Assessment list
11. `frontend/src/pages/user/OrgUserManageUsers.tsx` - User management
12. `frontend/src/pages/admin/ManageQuestions.tsx` - Question management
13. `frontend/src/pages/admin/ManageUsers.tsx` - Admin user management
14. `frontend/src/pages/admin/ManageOrganizations.tsx` - Organization management
15. `frontend/src/pages/admin/ReviewAssessments.tsx` - Assessment review
16. `frontend/src/main.tsx` - App initialization

## Migration Strategy

### **Phase 1: Core Database Migration**

#### **Files to Create** (New)

1. `frontend/src/services/rxdb.ts` - RxDB database setup
2. `frontend/src/schemas/` - RxDB schema definitions
   - `frontend/src/schemas/questionSchema.ts`
   - `frontend/src/schemas/assessmentSchema.ts`
   - `frontend/src/schemas/responseSchema.ts`
   - `frontend/src/schemas/categorySchema.ts`
   - `frontend/src/schemas/submissionSchema.ts`
   - `frontend/src/schemas/reportSchema.ts`
   - `frontend/src/schemas/organizationSchema.ts`
   - `frontend/src/schemas/userSchema.ts`
   - `frontend/src/schemas/invitationSchema.ts`

#### **Files to Replace** (Major Changes)

1. `frontend/src/services/indexeddb.ts` → `frontend/src/services/rxdb.ts`
2. `frontend/src/types/offline.ts` → `frontend/src/types/rxdb.ts`

#### **Files to Modify** (Minor Changes)

1. `frontend/src/services/apiInterceptor.ts` - Update to use RxDB
2. `frontend/src/services/syncService.ts` - Update to use RxDB
3. `frontend/src/services/initialDataLoader.ts` - Update to use RxDB

### **Phase 2: Hook Migration**

#### **Files to Replace** (Major Changes)

1. `frontend/src/hooks/useOfflineApi.ts` → `frontend/src/hooks/useRxApi.ts`
2. `frontend/src/hooks/useOfflineQuery.ts` → `frontend/src/hooks/useRxQuery.ts`
3. `frontend/src/hooks/useOfflineLocal.ts` → `frontend/src/hooks/useRxLocal.ts`
4. `frontend/src/hooks/useInitialDataLoad.ts` → `frontend/src/hooks/useRxInitialDataLoad.ts`

### **Phase 3: Component Migration**

#### **Files to Modify** (Import Changes)

1. `frontend/src/pages/user/Assesment.tsx`
2. `frontend/src/pages/user/Assessments.tsx`
3. `frontend/src/pages/user/OrgUserManageUsers.tsx`
4. `frontend/src/pages/admin/ManageQuestions.tsx`
5. `frontend/src/pages/admin/ManageUsers.tsx`
6. `frontend/src/pages/admin/ManageOrganizations.tsx`
7. `frontend/src/pages/admin/ReviewAssessments.tsx`
8. `frontend/src/main.tsx`

## Detailed Migration Plan

### **Step 1: Install RxDB Dependencies**

```bash
npm install rxdb rxjs
npm install --save-dev @types/rxjs
```

### **Step 2: Create RxDB Database Setup**

#### **New File: `frontend/src/services/rxdb.ts`**

```typescript
import { createRxDatabase } from "rxdb";
import { getRxStorageIndexedDB } from "rxdb/plugins/storage-indexeddb";
import { addRxPlugin } from "rxdb/plugins/core";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";

// Import schemas
import { questionSchema } from "../schemas/questionSchema";
import { assessmentSchema } from "../schemas/assessmentSchema";
import { responseSchema } from "../schemas/responseSchema";
// ... other schemas

export const createDatabase = async () => {
  const db = await createRxDatabase({
    name: "dgat-sustainability-db",
    storage: getRxStorageIndexedDB(),
    ignoreDuplicate: true,
  });

  // Add collections
  await db.addCollections({
    questions: { schema: questionSchema },
    assessments: { schema: assessmentSchema },
    responses: { schema: responseSchema },
    // ... other collections
  });

  return db;
};

export let rxdb: any = null;

export const initializeRxDB = async () => {
  rxdb = await createDatabase();
  return rxdb;
};
```

### **Step 3: Create Schema Definitions**

#### **New File: `frontend/src/schemas/questionSchema.ts`**

```typescript
import { RxJsonSchema } from "rxdb";

export const questionSchema: RxJsonSchema<any> = {
  title: "question",
  version: 0,
  description: "Question schema for sustainability assessments",
  type: "object",
  properties: {
    question_id: {
      type: "string",
      primary: true,
    },
    category: {
      type: "string",
    },
    text: {
      type: "string",
    },
    weight: {
      type: "number",
    },
    sync_status: {
      type: "string",
      enum: ["synced", "pending", "failed"],
    },
    local_changes: {
      type: "boolean",
    },
    created_at: {
      type: "string",
    },
    updated_at: {
      type: "string",
    },
  },
  required: ["question_id", "category", "text"],
  indexes: ["category", "sync_status", "updated_at"],
};
```

### **Step 4: Update API Interceptor**

#### **Modified File: `frontend/src/services/apiInterceptor.ts`**

```typescript
// Replace offlineDB imports with rxdb
import { rxdb } from './rxdb';

// Update interceptGet method
async interceptGet<T>(apiCall, localGet, entityType) {
  try {
    // Use RxDB reactive queries instead of manual IndexedDB calls
    const collection = rxdb[entityType];
    const query = collection.find();

    // Subscribe to local data changes
    const localData$ = query.$;

    // Try API call if online
    if (this.isOnline) {
      try {
        const result = await apiCall();
        // RxDB will automatically handle local storage
        await this.storeLocally(result, entityType);
        return result;
      } catch (apiError) {
        console.warn(`API call failed, using local data`);
      }
    }

    // Return local data (RxDB handles reactivity)
    return await localGet();
  } catch (error) {
    throw error;
  }
}
```

### **Step 5: Update Hooks**

#### **New File: `frontend/src/hooks/useRxApi.ts`**

```typescript
import { useRxQuery } from "rxdb-hooks";
import { rxdb } from "../services/rxdb";

// Replace useOfflineQuestions
export function useRxQuestions() {
  const { data, isLoading, error } = useRxQuery(rxdb.questions.find().$, {
    offline: true,
    sync: true,
  });

  return {
    data: { questions: data || [] },
    isLoading,
    error,
    refetch: () => rxdb.questions.find().exec(),
  };
}

// Replace useOfflineQuestionsMutation
export function useRxQuestionsMutation() {
  const createQuestion = async (question) => {
    // RxDB handles optimistic updates automatically
    await rxdb.questions.insert(question);

    // Background sync happens automatically
    return question;
  };

  return { createQuestion };
}
```

### **Step 6: Update Components**

#### **Modified File: `frontend/src/pages/user/Dashboard.tsx`**

```typescript
// Replace imports
import {
  useRxSubmissions,
  useRxReports,
  useRxAssessments,
} from "@/hooks/useRxApi";

// Replace hook usage
const { data, isLoading, error } = useRxSubmissions();
```

## Migration Benefits

### **Code Reduction**

- **Before**: ~2,000 lines of custom offline logic
- **After**: ~500 lines with RxDB
- **Reduction**: 75% less code

### **Simplified Architecture**

```typescript
// Before: Complex manual state management
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  offlineDB.getAllQuestions().then(setData);
}, []);

// After: Reactive RxDB
const { data, isLoading } = useRxQuery(rxdb.questions.find().$);
```

### **Automatic Features**

- ✅ **Real-time updates** - No manual state management
- ✅ **Background sync** - Built-in synchronization
- ✅ **Conflict resolution** - Automatic conflict handling
- ✅ **Optimistic updates** - Immediate UI feedback
- ✅ **Offline-first** - Works completely offline

## Migration Timeline

### **Phase 1: Foundation** (1-2 weeks)

- [ ] Install RxDB dependencies
- [ ] Create database setup
- [ ] Define all schemas
- [ ] Create basic RxDB service

### **Phase 2: Core Migration** (2-3 weeks)

- [ ] Migrate API interceptor
- [ ] Migrate sync service
- [ ] Migrate initial data loader
- [ ] Create new RxDB hooks

### **Phase 3: Component Migration** (1-2 weeks)

- [ ] Update all component imports
- [ ] Replace hook usage
- [ ] Test all functionality
- [ ] Remove old IndexedDB code

### **Phase 4: Cleanup** (1 week)

- [ ] Remove unused files
- [ ] Update documentation
- [ ] Performance testing
- [ ] Final validation

## Risk Assessment

### **Low Risk**

- ✅ **Data integrity** - RxDB maintains data consistency
- ✅ **Offline functionality** - RxDB is offline-first by design
- ✅ **Performance** - RxDB is optimized for reactive updates

### **Medium Risk**

- ⚠️ **Learning curve** - Team needs to learn RxDB concepts
- ⚠️ **Migration complexity** - Significant refactoring required
- ⚠️ **Testing effort** - All functionality needs retesting

### **Mitigation Strategies**

- **Gradual migration** - Migrate one feature at a time
- **Parallel testing** - Keep old system running during migration
- **Comprehensive testing** - Test all offline scenarios
- **Team training** - Provide RxDB documentation and examples

## Conclusion

The migration to RxDB would significantly simplify your codebase while maintaining all current functionality. The main trade-off is the initial migration effort versus long-term maintainability benefits.

**Recommendation**: If you're planning to add real-time features or want to reduce code complexity, RxDB migration is worthwhile. If your current system is working well and you don't need additional features, the migration effort may not be justified.
