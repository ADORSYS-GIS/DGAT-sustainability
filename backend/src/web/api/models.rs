use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// =============== Common Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

// =============== Health Models ===============

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: String,
    pub version: String,
    pub checks: HealthChecks,
}

#[derive(Debug, Serialize)]
pub struct HealthChecks {
    pub database: String,
    pub keycloak: String,
}

#[derive(Debug, Serialize)]
pub struct MetricsResponse {
    pub uptime: f64,
    pub requests: RequestMetrics,
    pub memory: MemoryMetrics,
    pub database: DatabaseMetrics,
}

#[derive(Debug, Serialize)]
pub struct RequestMetrics {
    pub total: u64,
    pub per_second: f64,
}

#[derive(Debug, Serialize)]
pub struct MemoryMetrics {
    pub used: u64,
    pub total: u64,
}

#[derive(Debug, Serialize)]
pub struct DatabaseMetrics {
    pub connections: u32,
    pub queries_per_second: f64,
}

// =============== Question Models ===============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub question_id: Uuid,
    pub category: String,
    pub created_at: String,
    pub latest_revision: QuestionRevision,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionRevision {
    pub question_revision_id: Uuid,
    pub question_id: Uuid,
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateQuestionRequest {
    pub category: String,
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateQuestionRequest {
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
}

#[derive(Debug, Serialize)]
pub struct QuestionResponse {
    pub question: Question,
}

#[derive(Debug, Serialize)]
pub struct QuestionWithRevisionsResponse {
    pub question: Question,
    pub revisions: Vec<QuestionRevision>,
}

#[derive(Debug, Serialize)]
pub struct QuestionRevisionResponse {
    pub revision: QuestionRevision,
}

#[derive(Debug, Serialize)]
pub struct QuestionListResponse {
    pub questions: Vec<Question>,
}

#[derive(Debug, Serialize)]
pub struct QuestionRevisionListResponse {
    pub revisions: Vec<QuestionRevision>,
}

// =============== Assessment Models ===============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assessment {
    pub assessment_id: Uuid,
    pub org_id: String,
    pub language: String,
    pub name: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAssessmentRequest {
    pub language: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAssessmentRequest {
    pub language: String,
}

#[derive(Debug, Serialize)]
pub struct AssessmentResponse {
    pub assessment: Assessment,
}

#[derive(Debug, Serialize)]
pub struct AssessmentListResponse {
    pub assessments: Vec<Assessment>,
}

#[derive(Debug, Serialize)]
pub struct AssessmentWithResponsesResponse {
    pub assessment: Assessment,
    pub responses: Vec<Response>,
}

// =============== Response Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub response_id: Uuid,
    pub assessment_id: Uuid,
    pub question_revision_id: Uuid,
    pub response: Vec<String>,
    pub version: i32,
    pub updated_at: String,
    pub files: Vec<FileMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateResponseRequest {
    pub question_revision_id: Uuid,
    pub response: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateResponseRequest {
    pub response: Vec<String>,
    pub version: i32,
}

#[derive(Debug, Serialize)]
pub struct ResponseResponse {
    pub response: Response,
}

#[derive(Debug, Serialize)]
pub struct ResponseListResponse {
    pub responses: Vec<Response>,
}

// =============== Submission Models ===============

#[derive(Debug, Serialize)]
pub struct AssessmentSubmission {
    pub assessment_id: Uuid,
    pub org_id: String,
    pub content: serde_json::Value,
    pub submitted_at: String,
    pub review_status: String,
    pub reviewed_at: Option<String>,
}
#[derive(Debug, Serialize)]
pub struct Submission {
    pub submission_id: Uuid,
    pub org_id: String,
    pub content: serde_json::Value,
    pub submitted_at: String,
    pub review_status: String,
    pub reviewed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AssessmentSubmissionResponse {
    pub submission: AssessmentSubmission,
}

#[derive(Debug, Serialize)]
pub struct SubmissionListResponse {
    pub submissions: Vec<Submission>,
}

#[derive(Debug, Serialize)]
pub struct SubmissionDetailResponse {
    pub submission: AssessmentSubmission,
}

// =============== Admin Submission Models ===============

#[derive(Debug, Serialize)]
pub struct AdminSubmissionDetail {
    pub submission_id: Uuid,
    pub assessment_id: Uuid,
    pub org_id: String,
    pub org_name: String, // Add organization name
    pub content: AdminSubmissionContent,
    pub review_status: String,
    pub submitted_at: String,
    pub reviewed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdminSubmissionContent {
    pub assessment: AdminAssessmentInfo,
    pub responses: Vec<AdminResponseDetail>,
}

#[derive(Debug, Serialize)]
pub struct AdminAssessmentInfo {
    pub assessment_id: Uuid,
    pub language: String,
}

#[derive(Debug, Serialize)]
pub struct AdminResponseDetail {
    pub question_text: String,
    pub question_category: String,
    pub response: String,
    pub version: i32,
    pub files: Vec<FileMetadata>,
}

#[derive(Debug, Serialize)]
pub struct AdminSubmissionListResponse {
    pub submissions: Vec<AdminSubmissionDetail>,
}

// =============== Review Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct Review {
    pub review_id: Uuid,
    pub submission_id: Uuid,
    pub reviewer_id: String,
    pub reviewer_email: Option<String>,
    pub status: String,
    pub decision: Option<String>,
    pub comments: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReviewRequest {
    pub decision: String,
    pub comments: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReviewRequest {
    pub status: Option<String>,
    pub decision: Option<String>,
    pub comments: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReviewResponse {
    pub review: Review,
}

#[derive(Debug, Serialize)]
pub struct ReviewListResponse {
    pub reviews: Vec<Review>,
}

#[derive(Debug, Serialize)]
pub struct ReviewDetailResponse {
    pub review: Review,
    pub submission: AssessmentSubmission,
}

#[derive(Debug, Serialize)]
pub struct AdminReview {
    pub review_id: Uuid,
    pub submission_id: Uuid,
    pub user_email: String,
    pub reviewer_id: String,
    pub reviewer_email: String,
    pub status: String,
    pub decision: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct AdminReviewListResponse {
    pub reviews: Vec<AdminReview>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssignReviewerRequest {
    pub submission_id: Uuid,
    pub reviewer_id: String,
}

#[derive(Debug, Serialize)]
pub struct ReviewAssignmentResponse {
    pub review_id: Uuid,
    pub submission_id: Uuid,
    pub reviewer_id: String,
    pub assigned_at: String,
}

// =============== File Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub file_id: Uuid,
    pub filename: String,
    pub size: i64,
    pub content_type: String,
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct FileUploadResponse {
    pub file: FileMetadata,
}

#[derive(Debug, Serialize)]
pub struct FileMetadataResponse {
    pub metadata: FileMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttachFileRequest {
    pub file_id: Uuid,
}

// =============== Report Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct Report {
    pub report_id: Uuid,
    pub submission_id: Uuid,
    pub status: String,
    pub generated_at: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateReportRequest {
    pub category: String,
    pub recommendation: String
}

#[derive(Debug, Serialize)]
pub struct ReportGenerationResponse {
    pub report_id: Uuid,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ReportResponse {
    pub report: Report,
}

#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub reports: Vec<Report>,
}

// =============== Organization Models ===============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrganizationDomainRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationCreateRequest {
    pub name: String,
    pub domains: Vec<OrganizationDomainRequest>,
    #[serde(rename = "redirectUrl")]
    pub redirect_url: String,
    pub enabled: String, // Note: This comes as string in the payload sample
    pub attributes: Option<HashMap<String, Vec<String>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemberRequest {
    pub user_id: String,
    pub roles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvitationRequest {
    pub email: String,
    pub roles: Vec<String>,
    pub expiration: Option<String>,
}

// =============== Category Models ===============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub category_id: Uuid,
    pub name: String,
    pub weight: i32,
    pub order: i32,
    pub template_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub weight: i32,
    pub order: i32,
    pub template_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub weight: Option<i32>,
    pub order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct CategoryResponse {
    pub category: Category,
}

#[derive(Debug, Serialize)]
pub struct CategoryListResponse {
    pub categories: Vec<Category>,
}
