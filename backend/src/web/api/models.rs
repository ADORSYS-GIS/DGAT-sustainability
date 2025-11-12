use serde::{Deserialize, Serialize};

use utoipa::ToSchema;

#[derive(serde::Serialize, ToSchema)]
pub struct AdminSubmissionListResponse {
    pub submissions: Vec<AdminSubmissionDetail>,
}

// These models will be properly implemented for UserInvitationRequest/Response
// in the common models keycloak module

#[derive(serde::Serialize, ToSchema)]
pub struct AssessmentListResponse {
    pub assessments: Vec<Assessment>,
}

#[derive(serde::Serialize, ToSchema)]
pub struct SubmissionListResponse {
    pub submissions: Vec<Submission>,
}

#[derive(serde::Serialize, ToSchema)]
pub struct SubmissionDetailResponse {
    pub submission: Submission,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub enum UserInvitationStatus {
    Pending,
    Active,
    Expired,
}

#[derive(serde::Serialize, ToSchema)]
pub struct Organization {
    pub name: String,
    pub attributes: Option<serde_json::Value>,
}

use std::collections::HashMap;
use uuid::Uuid;

// Create wrapper type for Uuid to avoid orphan rules
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UuidWrapper(pub Uuid);

// Create wrapper type for ApiError to avoid orphan rules
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ApiErrorWrapper {
    pub error: String,
}

// Define conversion between ApiError and ApiErrorWrapper
impl From<crate::web::api::error::ApiError> for ApiErrorWrapper {
    fn from(err: crate::web::api::error::ApiError) -> Self {
        match err {
            crate::web::api::error::ApiError::BadRequest(msg) => Self { error: msg },
            crate::web::api::error::ApiError::NotFound(msg) => Self { error: msg },
            crate::web::api::error::ApiError::Forbidden(msg) => Self { error: msg },
            crate::web::api::error::ApiError::Conflict(msg) => Self { error: msg },
            crate::web::api::error::ApiError::InternalServerError(msg) => Self { error: msg },
            crate::web::api::error::ApiError::DatabaseError(msg) => Self {
                error: format!("Database error: {msg}"),
            },
        }
    }
}

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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QuestionRevision {
    pub question_revision_id: Uuid,
    pub question_id: Uuid,
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateQuestionRequest {
    pub category_id: Uuid,
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateQuestionRequest {
    pub category_id: Uuid,
    pub category: String, // Keep this for the response
    pub text: HashMap<String, String>, // Multilingual text
    pub weight: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QuestionResponse {
    pub question: Question,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QuestionWithRevisionsResponse {
    pub question: Question,
    pub revisions: Vec<QuestionRevision>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QuestionRevisionResponse {
    pub revision: QuestionRevision,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QuestionListResponse {
    pub questions: Vec<Question>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QuestionRevisionListResponse {
    pub revisions: Vec<QuestionRevision>,
}

// =============== Assessment Models ===============

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, ToSchema)]
pub enum AssessmentStatus {
    #[serde(rename = "draft")]
    #[default]
    Draft,
    #[serde(rename = "submitted")]
    Submitted,
    #[serde(rename = "reviewed")]
    Reviewed,
}

impl std::fmt::Display for AssessmentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AssessmentStatus::Draft => write!(f, "draft"),
            AssessmentStatus::Submitted => write!(f, "submitted"),
            AssessmentStatus::Reviewed => write!(f, "reviewed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Assessment {
    pub assessment_id: Uuid,
    pub org_id: String,
    pub language: String,
    pub name: String,
    pub categories: Vec<Uuid>,
    pub status: AssessmentStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateAssessmentRequest {
    pub language: String,
    pub name: String,
    pub categories: Vec<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAssessmentRequest {
    pub language: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AssessmentResponse {
    pub assessment: Assessment,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AssessmentWithResponsesResponse {
    pub assessment: Assessment,
    pub responses: Vec<Response>,
}

// =============== Response Models ===============

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Response {
    pub response_id: Uuid,
    pub assessment_id: Uuid,
    pub question_revision_id: Uuid,
    pub response: Vec<String>,
    pub version: i32,
    pub updated_at: String,
    pub files: Vec<FileMetadata>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateResponseRequest {
    pub question_revision_id: Uuid,
    pub response: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateResponseRequest {
    pub response: Vec<String>,
    pub version: i32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ResponseResponse {
    pub response: Response,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ResponseListResponse {
    pub responses: Vec<Response>,
}

// =============== Submission Models ===============

#[derive(Debug, Serialize, ToSchema)]
pub struct AssessmentSubmission {
    pub assessment_id: Uuid,
    pub org_id: String,
    pub assessment_name: String,
    pub content: serde_json::Value,
    pub submitted_at: String,
    pub review_status: String,
    pub reviewed_at: Option<String>,
}
#[derive(Debug, Serialize, ToSchema)]
pub struct Submission {
    pub submission_id: Uuid,
    pub org_id: String,
    pub assessment_name: String,
    pub content: serde_json::Value,
    pub submitted_at: String,
    pub review_status: String,
    pub reviewed_at: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AssessmentSubmissionResponse {
    pub submission: AssessmentSubmission,
}

// =============== Admin Submission Models ===============

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminSubmissionContent {
    pub assessment: AdminAssessmentInfo,
    pub responses: Vec<AdminResponseDetail>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminAssessmentInfo {
    pub assessment_id: Uuid,
    pub language: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminResponseDetail {
    pub question_text: String,
    pub question_category: String,
    pub response: String,
    pub version: i32,
    pub files: Vec<FileMetadata>,
}

// =============== Review Models ===============

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateReviewRequest {
    pub decision: String,
    pub comments: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateReviewRequest {
    pub status: Option<String>,
    pub decision: Option<String>,
    pub comments: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewResponse {
    pub review: Review,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewListResponse {
    pub reviews: Vec<Review>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewDetailResponse {
    pub review: Review,
    pub submission: AssessmentSubmission,
}

#[derive(Debug, Serialize, ToSchema)]
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

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminReviewListResponse {
    pub reviews: Vec<AdminReview>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminReport {
    pub report_id: Uuid,
    pub submission_id: Uuid,
    pub org_id: String,
    pub org_name: String,
    pub status: String,
    pub generated_at: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AdminReportListResponse {
    pub reports: Vec<AdminReport>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AssignReviewerRequest {
    pub submission_id: Uuid,
    pub reviewer_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewAssignmentResponse {
    pub review_id: Uuid,
    pub submission_id: Uuid,
    pub reviewer_id: String,
    pub assigned_at: String,
}

// =============== File Models ===============

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FileMetadata {
    pub file_id: Uuid,
    pub filename: String,
    pub size: i64,
    pub content_type: String,
    pub created_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct FileUploadResponse {
    pub file: FileMetadata,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct FileMetadataResponse {
    pub metadata: FileMetadata,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AttachFileRequest {
    pub file_id: Uuid,
}

// =============== Report Models ===============

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Report {
    pub report_id: Uuid,
    pub submission_id: Uuid,
    pub assessment_id: Uuid,
    pub assessment_name: String,
    pub status: String,
    pub generated_at: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct GenerateReportRequest {
    pub category: String,
    pub recommendation: String,
    pub status: Option<String>, // New field for action plan status
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateRecommendationStatusRequest {
    pub report_id: Uuid,
    pub recommendation_id: String,
    pub category: String,
    pub status: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OrganizationActionPlan {
    pub organization_id: Uuid,
    pub organization_name: String,
    pub recommendations: Vec<RecommendationWithStatus>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RecommendationWithStatus {
    pub recommendation_id: Uuid,
    pub report_id: Uuid,
    pub assessment_id: Uuid,
    pub assessment_name: String,
    pub category: String,
    pub recommendation: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ActionPlanListResponse {
    pub organizations: Vec<OrganizationActionPlan>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportGenerationResponse {
    pub report_id: Uuid,
    pub status: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportResponse {
    pub report: Report,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportListResponse {
    pub reports: Vec<Report>,
}

// =============== Organization Models ===============

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OrganizationDomainRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct OrganizationCreateRequest {
    pub name: String,
    pub domains: Vec<OrganizationDomainRequest>,
    #[serde(rename = "redirectUrl")]
    pub redirect_url: String,
    pub enabled: String, // Note: This comes as string in the payload sample
    pub attributes: Option<HashMap<String, Vec<String>>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MemberRequest {
    pub user_id: String,
    pub roles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct InvitationRequest {
    pub email: String,
    pub roles: Vec<String>,
    pub expiration: Option<String>,
}

// =============== Category Models ===============

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Category {
    pub category_id: Uuid,
    pub name: String,
    pub weight: i32,
    pub order: i32,
    pub template_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub weight: i32,
    pub order: i32,
    pub template_id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub weight: Option<i32>,
    pub order: Option<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CategoryResponse {
    pub category: Category,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CategoryListResponse {
    pub categories: Vec<Category>,
}

// =============== Category Catalog Models ===============

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CategoryCatalog {
    pub category_catalog_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_id: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategoryCatalogRequest {
    pub name: String,
    pub description: Option<String>,
    pub template_id: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCategoryCatalogRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CategoryCatalogResponse {
    pub category_catalog: CategoryCatalog,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CategoryCatalogListResponse {
    pub category_catalogs: Vec<CategoryCatalog>,
}

// =============== Organization Categories Models ===============

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OrganizationCategory {
    pub organization_category_id: Uuid,
    pub keycloak_organization_id: String,
    pub category_catalog_id: Uuid,
    pub category_name: String, // Denormalized for easier access
    pub weight: i32,
    pub order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateOrganizationCategoryRequest {
    pub keycloak_organization_id: String,
    pub category_catalog_id: Uuid,
    pub weight: i32,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateOrganizationCategoryRequest {
    pub weight: Option<i32>,
    pub order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AssignCategoriesToOrganizationRequest {
    pub category_catalog_ids: Vec<Uuid>,
    pub weights: Option<Vec<i32>>, // If not provided, weights will be distributed equally
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OrganizationCategoryResponse {
    pub organization_category: OrganizationCategory,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OrganizationCategoryListResponse {
    pub organization_categories: Vec<OrganizationCategory>,
}

// Add implementation for AssessmentQuery that was missing IntoParams
#[derive(Debug, Deserialize, ToSchema)]
pub struct AssessmentQuery {
    pub status: Option<String>,
    pub language: Option<String>,
    pub cache_buster: Option<i64>,
}

// Properly implement IntoParams without using 'self'
impl utoipa::IntoParams for AssessmentQuery {
    fn into_params(
        parameter_in_provider: impl Fn() -> Option<utoipa::openapi::path::ParameterIn>,
    ) -> Vec<utoipa::openapi::path::Parameter> {
        use utoipa::openapi::path::{ParameterBuilder, ParameterIn};

        let parameter_in = parameter_in_provider().unwrap_or(ParameterIn::Query);

        vec![
            ParameterBuilder::new()
                .name("status")
                .description(Some("Filter assessments by status"))
                .parameter_in(parameter_in.clone())
                .required(utoipa::openapi::Required::False)
                .build(),
            ParameterBuilder::new()
                .name("language")
                .description(Some("Filter assessments by language"))
                .parameter_in(parameter_in.clone())
                .required(utoipa::openapi::Required::False)
                .build(),
            ParameterBuilder::new()
                .name("cache_buster")
                .description(Some("Cache buster to prevent stale data"))
                .parameter_in(parameter_in)
                .required(utoipa::openapi::Required::False)
                .build(),
        ]
    }
}
