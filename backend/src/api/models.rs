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

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationMeta {
    pub page: u32,
    pub limit: u32,
    pub total: u32,
    pub total_pages: u32,
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
    pub meta: PaginationMeta,
}

#[derive(Debug, Serialize)]
pub struct QuestionRevisionListResponse {
    pub revisions: Vec<QuestionRevision>,
}

// =============== Assessment Models ===============

#[derive(Debug, Serialize, Deserialize)]
pub struct Assessment {
    pub assessment_id: Uuid,
    pub user_id: String,
    pub language: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAssessmentRequest {
    pub language: String,
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
    pub meta: PaginationMeta,
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
    pub response: String,
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
    pub response: String,
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
    pub user_id: String,
    pub content: serde_json::Value,
    pub submitted_at: String,
}

#[derive(Debug, Serialize)]
pub struct AssessmentSubmissionResponse {
    pub submission: AssessmentSubmission,
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
    pub assessment_id: Uuid,
    pub report_type: String,
    pub status: String,
    pub generated_at: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateReportRequest {
    pub report_type: String,
    pub options: Option<serde_json::Value>,
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
