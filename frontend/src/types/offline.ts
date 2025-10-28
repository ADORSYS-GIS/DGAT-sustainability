// Enhanced offline types for IndexedDB storage
// These extend the existing OpenAPI types with offline-specific fields

import type {
  Question,
  Assessment,
  Response,
  Submission,
  Report,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  QuestionRevision,
  FileMetadata,
  Review,
  RecommendationWithStatus, // Import the type
  AssessmentDetailResponse, // Import AssessmentDetailResponse
  AdminReport,
  AdminSubmissionDetail,
} from "@/openapi-rq/requests/types.gen";
import type { CategoryCatalog } from "@/openapi-rq/requests/types.gen";

// New type for storing images offline
export interface OfflineImage {
  id: string; // URL or a unique identifier for the image
  dataUrl: string; // Base64 encoded image data
  timestamp: string; // When the image was cached
}

// New types for report data structure, aligning with the actual API response
export interface ReportRecommendation {
  id: string;
  status: "todo" | "in_progress" | "done" | "approved";
  text: string;
}

export interface ReportCategoryContent {
  recommendations: ReportRecommendation[];
  questions?: { answer: unknown; question: string }[];
}

export interface ReportCategoryData {
  [category: string]: ReportCategoryContent;
}

// Create a more specific report type that aligns with the actual API response
export interface DetailedReport extends Omit<Report, 'data'> {
  assessment_id: string;
  assessment_name: string;
  data: ReportCategoryData[];
}

// Base interface for all offline entities
export interface OfflineEntity {
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes?: boolean;
  last_synced?: string;
}

// Enhanced Question with offline fields
export interface OfflineQuestion extends Omit<Question, 'latest_revision'>, OfflineEntity {
  revisions: QuestionRevision[];
  category: string;
  category_id: string;
  search_text?: string; // For efficient text search
  latest_revision: QuestionRevision & { text: Record<string, string> };
  order?: number;
}

// Enhanced Assessment with offline fields
export interface OfflineAssessment extends Omit<Assessment, 'categories'>, OfflineEntity {
  organization_id?: string;
  user_id?: string; // Add user_id
  user_email?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  progress_percentage?: number;
  last_activity?: string;
  categories?: OfflineCategoryCatalog[]; // List of category UUIDs assigned to this assessment
  recommendations?: string;
}

// Enhanced Response with offline fields
export interface OfflineResponse extends Response, OfflineEntity {
  question_text?: string; // Cached question text for offline display
  question_category?: string;
  files?: FileMetadata[];
  is_draft?: boolean;
}

// Enhanced CategoryCatalog with offline fields
export interface OfflineCategoryCatalog extends CategoryCatalog, OfflineEntity {
  question_count?: number;
}

// Enhanced Submission with offline fields
export interface OfflineSubmission extends Omit<Submission, 'review_status'>, OfflineEntity {
  organization_id?: string;
  org_name?: string; // Add organization name for offline display
  reviewer_id?: string;
  reviewer_email?: string;
  review_comments?: string;
  files?: FileMetadata[];
  review_status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'revision_requested' | 'draft' | 'reviewed';
}

// Enhanced Draft Submission with offline fields
export interface OfflineDraftSubmission extends Omit<Submission, 'review_status'>, OfflineEntity {
  organization_id?: string;
  org_name?: string; // Add organization name for offline display
  assessment_name: string;
  review_status: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'revision_requested' | 'draft' | 'reviewed' | 'pending_approval';
}

// Enhanced Report with offline fields
export interface OfflineReport extends Report, OfflineEntity {
  organization_id?: string;
  user_id?: string;
  file_path?: string; // Local file path if downloaded
  is_downloaded?: boolean;
}

// Enhanced AdminReport with offline fields
export interface OfflineAdminReport extends AdminReport, OfflineEntity {}

// Enhanced Recommendation with offline fields
export interface OfflineRecommendation extends RecommendationWithStatus, OfflineEntity {
  recommendation_id: string; // Unique ID for IndexedDB
  organization_id: string;
  organization_name: string; // Cached organization name for display
  assessment_id: string;
  assessment_name: string;
  submission_id?: string;
}

// Enhanced Organization with offline fields (fixing the created_at conflict)
export interface OfflineOrganization extends Omit<Organization, 'created_at' | 'updated_at'>, OfflineEntity {
  organization_id: string; // Map from API 'id' field
  member_count?: number;
  assessment_count?: number;
  submission_count?: number;
  is_active?: boolean;
  domains: string[];
  redirectUrl: string; // Add redirectUrl
  created_at?: string; // Add created_at
  enabled?: 'true' | 'false'; // Add enabled property
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
export interface OfflineInvitation extends OrganizationInvitation, OfflineEntity {
  inviter_email?: string;
  organization_name?: string;
}

// Sync Queue Item for background synchronization
export type SyncableEntityType =
  | "question"
  | "assessment"
  | "category_catalog"
  | "response"
  | "submission"
  | "report"
  | "organization"
  | "user"
  | "invitation"
  | "draft_submission"
  | "assessment_review"
  | "submission_review";

export interface SyncQueueItem<T = unknown> {
  id: string;
  entity_type: SyncableEntityType;
  entity_id?: string;
  operation: "create" | "update" | "delete" | "submit" | "submit_review";
  data: T;
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
  network_quality: 'excellent' | 'good' | 'poor' | 'offline';
  connection_type?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

// Network Status for tracking connectivity
export interface NetworkStatus {
  is_online: boolean;
  connection_type?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  connection_quality: 'excellent' | 'good' | 'poor' | 'offline';
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
  conflict_type: 'timestamp' | 'version' | 'content';
  resolved: boolean;
  resolution_strategy: 'local_wins' | 'server_wins' | 'manual' | 'merge';
  created_at: string;
  resolved_at?: string;
}

// Data Loading Progress
export interface DataLoadingProgress {
  total_items: number;
  loaded_items: number;
  current_entity: string;
  status: 'idle' | 'loading' | 'completed' | 'failed';
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
  recommendations_count: number; // Add recommendations count
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
  category_catalogs: {
    key: string; // category_catalog_id
    value: OfflineCategoryCatalog;
  };
  submissions: {
    key: string; // submission_id
    value: OfflineSubmission;
  };
  draft_submissions: {
    key: string; // submission_id
    value: OfflineDraftSubmission;
  };
  reports: {
    key: string; // report_id
    value: OfflineReport;
  };
  admin_reports: {
    key: string; // report_id
    value: OfflineAdminReport;
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
  recommendations: { // Add the new object store
    key: string; // recommendation_id
    value: OfflineRecommendation;
  };
  organization_categories: {
    key: string; // composite key: org_id-cat_id
    value: OfflineOrganizationCategory;
  };
  images: { // New object store for images
    key: string; // image URL or unique ID
    value: OfflineImage;
  };
  action_plans: {
    key: string; // organization_id
    value: OfflineActionPlan;
  };
}

// New type for storing action plans offline
export interface OfflineActionPlan extends OfflineEntity {
  organization_id: string;
  organization_name: string;
  recommendations: OfflineRecommendation[];
}

// Represents the link between an organization and a category catalog
export interface OfflineOrganizationCategory extends OfflineEntity {
  id: string; // composite key org_id + category_id
  organization_id: string;
  category_catalog_id: string;
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
  status?: 'draft' | 'in_progress' | 'completed' | 'submitted';
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
  review_status?: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'revision_requested' | 'reviewed' | 'draft';
  submitted_after?: string;
  submitted_before?: string;
}

export interface UserFilters {
  organization_id?: string;
  roles?: string[];
  is_active?: boolean;
  search_text?: string;
  sync_status?: 'synced' | 'pending' | 'failed'; // Add sync_status filter
}

// Type definition for pending review submissions
export interface OfflinePendingReviewSubmission {
  id: string; // Unique ID for the pending review entry
  submission_id: string; // The ID of the submission being reviewed
  reviewer: string; // ID of the reviewer
  sync_status: 'pending' | 'synced' | 'failed';
  timestamp: string; // When the pending review was created/updated
  recommendation: string;
  status: "approved" | "rejected";
}

// Extend AssessmentDetailResponse to include categories for offline use
export interface OfflineAssessmentDetailResponse extends AssessmentDetailResponse {
  categories: OfflineCategoryCatalog[];
}

export interface ActionPlan {
  organization_id: string;
  organization_name: string;
  recommendations: RecommendationWithStatus[];
}

export type AdminSubmissionWithNames = AdminSubmissionDetail & {
  assessment_name: string;
  org_name: string;
};