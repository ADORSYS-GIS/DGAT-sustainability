use crate::web::api::models::*;
use axum::response::IntoResponse;
use utoipa::OpenApi;
/// OpenAPI documentation structure
#[derive(OpenApi)]
#[openapi(
    paths(
        crate::web::api::handlers::organization_categories::get_category_catalogs,
        crate::web::api::handlers::organization_categories::create_category_catalog,
        crate::web::api::handlers::organization_categories::get_organization_categories,
        crate::web::api::handlers::organization_categories::assign_categories_to_organization,
        crate::web::api::handlers::organization_categories::update_organization_category
    ),
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
        CategoryListResponse,
        CategoryCatalog,
        CreateCategoryCatalogRequest,
        UpdateCategoryCatalogRequest,
        CategoryCatalogResponse,
        CategoryCatalogListResponse,
        OrganizationCategory,
        CreateOrganizationCategoryRequest,
        UpdateOrganizationCategoryRequest,
        AssignCategoriesToOrganizationRequest,
        OrganizationCategoryResponse,
        OrganizationCategoryListResponse
    )),
    tags(
        (name = "User", description = "Operations related to user management"),
        (name = "Organization", description = "Operations related to organizations"),
        (name = "Organization Categories", description = "Operations related to organization-specific category management"),
        (name = "Category Catalog", description = "Operations related to category catalog management"),
        (name = "Health", description = "Health check operations"),
        (name = "Protected", description = "Protected resource operations")
    )
)]
struct ApiDoc;

#[axum::debug_handler]
pub async fn get_openapi_json() -> impl IntoResponse {
    // Get the OpenAPI spec from the ApiDoc struct
    let mut spec = ApiDoc::openapi();

    // Set the OpenAPI version
    spec.openapi = utoipa::openapi::OpenApiVersion::Version3;

    let url =
        std::env::var("SERVER_ADDRESS").unwrap_or_else(|_| "https://127.0.0.1:3001".to_string());

    // Add server info
    let mut server = utoipa::openapi::Server::new(url);
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
