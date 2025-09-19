use crate::web::api::models::*;
use axum::response::IntoResponse;
use utoipa::OpenApi;
/// OpenAPI documentation structure
#[derive(OpenApi)]
#[openapi(
    components(schemas(
        QuestionRevision,
        CreateQuestionRequest,
        UpdateQuestionRequest,
        QuestionResponse,
        QuestionWithRevisionsResponse,
        QuestionRevisionResponse,
        QuestionListResponse,
        QuestionRevisionListResponse,
        AssessmentStatus,
        Assessment,
        CreateAssessmentRequest,
        UpdateAssessmentRequest,
        AssessmentResponse,
        AssessmentListResponse,
        AssessmentWithResponsesResponse,
        Response,
        CreateResponseRequest,
        UpdateResponseRequest,
        ResponseResponse,
        ResponseListResponse,
        AssessmentSubmission,
        Submission,
        AssessmentSubmissionResponse,
        SubmissionListResponse,
        SubmissionDetailResponse,
        AdminSubmissionDetail,
        AdminSubmissionContent,
        AdminAssessmentInfo,
        AdminResponseDetail,
        AdminSubmissionListResponse,
        Review,
        CreateReviewRequest,
        UpdateReviewRequest,
        ReviewResponse,
        ReviewListResponse,
        ReviewDetailResponse,
        AdminReview,
        AdminReviewListResponse,
        AssignReviewerRequest,
        ReviewAssignmentResponse,
        FileMetadata,
        FileUploadResponse,
        FileMetadataResponse,
        AttachFileRequest,
        Report,
        GenerateReportRequest,
        UpdateRecommendationStatusRequest,
        OrganizationActionPlan,
        RecommendationWithStatus,
        ActionPlanListResponse,
        ReportGenerationResponse,
        ReportResponse,
        ReportListResponse,
        OrganizationDomainRequest,
        OrganizationCreateRequest,
        MemberRequest,
        InvitationRequest,
        Category,
        CreateCategoryRequest,
        UpdateCategoryRequest,
        CategoryResponse,
        CategoryListResponse
    )),
    tags(
        (name = "User", description = "Operations related to user management"),
        (name = "Organization", description = "Operations related to organizations"),
        (name = "Health", description = "Health check operations"),
        (name = "Protected", description = "Protected resource operations")
    )
)]
struct ApiDoc;

#[axum::debug_handler]
pub async fn get_openapi_json() -> impl IntoResponse {
    // Create basic info for the OpenAPI spec
    use utoipa::openapi::{Info, OpenApi, Server};

    // Create a minimal OpenAPI spec with empty paths that we'll populate later
    let mut spec = OpenApi::new(
        Info::new("Sustainability Tool API", "1.0.0"),
        utoipa::openapi::Paths::new(), // Empty paths
    );

    // Set the OpenAPI version
    spec.openapi = utoipa::openapi::OpenApiVersion::Version3;

    let url =
        std::env::var("SERVER_ADDRESS").unwrap_or_else(|_| "https://127.0.0.1:3001".to_string());

    // Add server info
    let mut server = Server::new(url);
    server.description = Some("Dynamic server address from environment".to_string());
    spec.servers = Some(vec![server]);

    match serde_json::to_string_pretty(&spec) {
        Ok(json) => (
            axum::http::StatusCode::OK,
            [("content-type", "application/json")],
            json,
        )
            .into_response(),
        Err(_) => axum::http::StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}
