// Enhanced offline types for IndexedDB storage
// These extend the existing OpenAPI types with offline-specific fields

import type {
  Assessment,
  Category,
  FileMetadata,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  Question,
  QuestionRevision,
  Report,
  Response,
  Submission,
} from "@/openapi-rq/requests/types.gen";

// Base interface for all offline entities
export interface OfflineEntity {
  updated_at: string;
  sync_status: "synced" | "pending" | "failed";
  local_changes?: boolean;
  last_synced?: string;
}

// Enhanced Question with offline fields
export interface OfflineQuestion extends Question, OfflineEntity {
  revisions: QuestionRevision[];
  category_id: string;
  search_text?: string; // For efficient text search
}

// Enhanced Assessment with offline fields
export interface OfflineAssessment extends Assessment, OfflineEntity {
  organization_id?: string;
  user_email?: string;
  user_id?: string; // Add user_id for filtering
  status: "draft" | "in_progress" | "completed" | "submitted";
  progress_percentage?: number;
  last_activity?: string;
}

// Enhanced Response with offline fields
export interface OfflineResponse extends Response, OfflineEntity {
  question_text?: string; // Cached question text for offline display
  question_category?: string;
  files?: FileMetadata[];
  is_draft?: boolean;
}

// Enhanced Category with offline fields
export interface OfflineCategory extends Category, OfflineEntity {
  question_count?: number;
  is_active?: boolean;
}

// Enhanced Submission with offline fields
export interface OfflineSubmission extends Submission, OfflineEntity {
  organization_id?: string;
  org_name?: string; // Add organization name for offline display
  reviewer_id?: string;
  reviewer_email?: string;
  review_comments?: string;
  files?: FileMetadata[];
}

// Enhanced Report with offline fields
export interface OfflineReport extends Report, OfflineEntity {
  organization_id?: string;
  user_id?: string;
  file_path?: string; // Local file path if downloaded
  is_downloaded?: boolean;
}

// Enhanced Organization with offline fields (fixing the created_at conflict)
export interface OfflineOrganization
  extends Omit<Organization, "created_at" | "updated_at">,
    OfflineEntity {
  organization_id: string; // Map from API 'id' field
  member_count?: number;
  assessment_count?: number;
  submission_count?: number;
  is_active?: boolean;
}

// Enhanced User/Organization Member with offline fields
export interface OfflineUser extends OrganizationMember, OfflineEntity {
  organization_id: string;
  assessment_count?: number;
  submission_count?: number;
  last_login?: string;
  permissions?: string[];
}

// Enhanced Organization Invitation with offline fields
export interface OfflineInvitation
  extends OrganizationInvitation,
    OfflineEntity {
  inviter_email?: string;
  organization_name?: string;
}

// Sync Queue Item for background synchronization
export interface SyncQueueItem {
  id: string;
  entity_type:
    | "question"
    | "assessment"
    | "category"
    | "response"
    | "submission"
    | "report"
    | "organization"
    | "user"
    | "invitation";
  entity_id?: string;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  priority: "low" | "normal" | "high" | "critical";
  created_at: string;
}

// Sync Status for tracking overall sync state
export interface SyncStatus {
  is_online: boolean;
  last_sync_attempt: string;
  last_successful_sync?: string;
  pending_items_count: number;
  failed_items_count: number;
  sync_in_progress: boolean;
  sync_progress_percentage: number;
  network_quality: "excellent" | "good" | "poor" | "offline";
  connection_type?: "wifi" | "cellular" | "ethernet" | "unknown";
}

// Network Status for tracking connectivity
export interface NetworkStatus {
  is_online: boolean;
  connection_type?: "wifi" | "cellular" | "ethernet" | "unknown";
  connection_quality: "excellent" | "good" | "poor" | "offline";
  last_online?: string;
  last_offline?: string;
  uptime_percentage: number;
  latency_ms?: number;
  bandwidth_mbps?: number;
}

// Conflict Resolution Data
export interface ConflictData {
  entity_type: string;
  entity_id: string;
  local_version: Record<string, unknown>; // Replacing 'any' with proper type
  server_version: Record<string, unknown>; // Replacing 'any' with proper type
  conflict_type: "timestamp" | "version" | "content";
  resolved: boolean;
  resolution_strategy: "local_wins" | "server_wins" | "manual" | "merge";
  created_at: string;
  resolved_at?: string;
}

// Data Loading Progress
export interface DataLoadingProgress {
  total_items: number;
  loaded_items: number;
  current_entity: string;
  status: "idle" | "loading" | "completed" | "failed";
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

// Database Statistics
export interface DatabaseStats {
  questions_count: number;
  assessments_count: number;
  responses_count: number;
  categories_count: number;
  submissions_count: number;
  reports_count: number;
  organizations_count: number;
  users_count: number;
  invitations_count: number;
  sync_queue_count: number;
  total_size_bytes: number;
  last_updated: string;
}

// IndexedDB Schema Definition
export interface OfflineDatabaseSchema {
  questions: {
    key: string; // question_id
    value: OfflineQuestion;
  };
  assessments: {
    key: string; // assessment_id
    value: OfflineAssessment;
  };
  responses: {
    key: string; // response_id
    value: OfflineResponse;
  };
  categories: {
    key: string; // category_id
    value: OfflineCategory;
  };
  submissions: {
    key: string; // submission_id
    value: OfflineSubmission;
  };
  reports: {
    key: string; // report_id
    value: OfflineReport;
  };
  organizations: {
    key: string; // organization id
    value: OfflineOrganization;
  };
  users: {
    key: string; // user_id
    value: OfflineUser;
  };
  invitations: {
    key: string; // invitation_id
    value: OfflineInvitation;
  };
  sync_queue: {
    key: string; // auto-generated id
    value: SyncQueueItem;
  };
  sync_status: {
    key: string; // 'current'
    value: SyncStatus;
  };
  network_status: {
    key: string; // 'current'
    value: NetworkStatus;
  };
  conflicts: {
    key: string; // auto-generated id
    value: ConflictData;
  };
  loading_progress: {
    key: string; // 'current'
    value: DataLoadingProgress;
  };
  database_stats: {
    key: string; // 'current'
    value: DatabaseStats;
  };
}

// Query Filters for efficient data retrieval
export interface QuestionFilters {
  category_id?: string;
  search_text?: string;
  is_active?: boolean;
}

export interface AssessmentFilters {
  user_id?: string;
  organization_id?: string;
  status?: "draft" | "in_progress" | "completed" | "submitted";
  created_after?: string;
  created_before?: string;
}

export interface ResponseFilters {
  assessment_id?: string;
  question_category?: string;
  is_draft?: boolean;
  updated_after?: string;
}

export interface SubmissionFilters {
  user_id?: string;
  organization_id?: string;
  review_status?:
    | "pending_review"
    | "under_review"
    | "approved"
    | "rejected"
    | "revision_requested"
    | "reviewed";
  submitted_after?: string;
  submitted_before?: string;
}

export interface UserFilters {
  organization_id?: string;
  roles?: string[];
  is_active?: boolean;
}
