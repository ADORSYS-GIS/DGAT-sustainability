# Offline-First Architecture for Assessment Management

## 1. Core Principles

- **Single Source of Truth**: The IndexedDB database is the single source of truth for the application. All data, whether the user is online or offline, is read from and written to IndexedDB.
- **Optimistic UI**: UI updates happen immediately after a user action, assuming the action will be successful. The UI is updated based on the data in IndexedDB.
- **Background Synchronization**: A dedicated `syncService` is responsible for all communication with the server. It runs in the background, synchronizing the local data with the server when the application is online.
- **Conflict Resolution**: A strategy for handling data conflicts that may arise during synchronization will be implemented. For now, a "last write wins" strategy will be used, with the server's version taking precedence.
- **Leverage TanStack Query**: TanStack Query will be used to manage the state of the data in the application, providing caching, background refetching, and a consistent way to interact with the data from IndexedDB.

## 2. Data Flow

### 2.1. Reading Data (Queries)

1.  A UI component calls a TanStack Query hook (e.g., `useAssessments`).
2.  The hook's `queryFn` reads the data directly from the corresponding object store in IndexedDB (e.g., `offlineDB.getAllAssessments()`).
3.  The data is returned to the UI component and rendered.
4.  TanStack Query manages caching and re-fetching from IndexedDB as needed.

### 2.2. Writing Data (Mutations)

1.  A UI component calls a TanStack Query mutation hook (e.g., `useCreateAssessment`).
2.  The hook's `mutationFn` performs the following steps:
    a.  Generates a temporary, unique ID for the new entity (e.g., using `uuidv4`).
    b.  Creates an "offline" version of the entity, including a `sync_status` of `'pending'`.
    c.  Saves the new entity to the appropriate IndexedDB object store.
    d.  Adds a task to the `sync_queue` object store in IndexedDB. This task will contain the necessary information to perform the API call later (e.g., `type: 'CREATE_ASSESSMENT'`, `payload: { ... }`).
3.  The `onSuccess` callback of the mutation invalidates the relevant TanStack Query queries, causing the UI to re-fetch the data from IndexedDB and display the new, optimistically created entity.

### 2.3. Data Synchronization

1.  The `syncService` listens for online/offline events.
2.  When the application comes online, the `syncService` processes the tasks in the `sync_queue`.
3.  For each task, the `syncService` performs the corresponding API call.
4.  Upon a successful API response:
    a.  The `syncService` updates the entity in IndexedDB with the data from the server's response. This may include replacing the temporary ID with the permanent ID from the server.
    b.  The `sync_status` of the entity is updated to `'synced'`.
    c.  The task is removed from the `sync_queue`.
5.  If an API call fails, the `syncService` will implement a retry mechanism with exponential backoff. If the task continues to fail, it will be marked as `'failed'` in the `sync_queue`, and the user will be notified.

## 3. IndexedDB Schema Enhancements

The existing `indexeddb.ts` is well-structured. We will enhance it by:

-   Ensuring all entities have a `sync_status: 'synced' | 'pending' | 'failed'` field.
-   Adding a `last_modified` timestamp to all entities to help with conflict resolution.
-   Ensuring the `sync_queue` item schema is robust enough to handle various types of mutations (create, update, delete) for all relevant entities.

## 4. TanStack Query Hooks

We will create a new set of hooks dedicated to offline-first data management. These hooks will follow a consistent pattern:

-   **`use[Entity]s`**: A query hook to fetch all items of an entity (e.g., `useAssessments`).
-   **`use[Entity]`**: A query hook to fetch a single item of an entity by its ID (e.g., `useAssessment(id)`).
-   **`useCreate[Entity]`**: A mutation hook for creating a new entity.
-   **`useUpdate[Entity]`**: A mutation hook for updating an existing entity.
-   **`useDelete[Entity]`**: A mutation hook for deleting an entity.

These hooks will encapsulate all the logic for interacting with IndexedDB and the `sync_queue`, providing a clean and consistent API for the UI components.

## 5. UI Components

The UI components will be refactored to use the new offline-first TanStack Query hooks. They will no longer need to be aware of the user's online/offline status. The UI will be driven entirely by the state of the data in IndexedDB, as managed by TanStack Query.