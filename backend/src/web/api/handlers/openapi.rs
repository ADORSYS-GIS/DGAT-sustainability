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
        crate::web::api::handlers::organization_categories::update_organization_category,
        // Categories
        // Assessments
        crate::web::api::handlers::assessments::list_assessments,
        crate::web::api::handlers::assessments::create_assessment,
        crate::web::api::handlers::assessments::get_assessment,
        crate::web::api::handlers::assessments::update_assessment,
        crate::web::api::handlers::assessments::delete_assessment,
        crate::web::api::handlers::assessments::user_submit_draft_assessment,
        crate::web::api::handlers::assessments::submit_assessment,
        // Questions
        crate::web::api::handlers::questions::list_questions,
        crate::web::api::handlers::questions::create_question,
        crate::web::api::handlers::questions::get_question,
        crate::web::api::handlers::questions::update_question,
        crate::web::api::handlers::questions::delete_question_revision_by_id,
        // Health
        crate::web::api::handlers::health::health_check,
        crate::web::api::handlers::health::metrics,
        // Questions
        crate::web::api::handlers::questions::list_questions,
        crate::web::api::handlers::questions::create_question,
        crate::web::api::handlers::questions::get_question,
        crate::web::api::handlers::questions::update_question,
        crate::web::api::handlers::questions::delete_question_revision_by_id,
        // Responses
        crate::web::api::handlers::responses::list_responses,
        crate::web::api::handlers::responses::create_response,
        crate::web::api::handlers::responses::get_response,
        crate::web::api::handlers::responses::update_response,
        crate::web::api::handlers::responses::delete_response,
        // Files
        crate::web::api::handlers::files::upload_file,
        crate::web::api::handlers::files::download_file,
        crate::web::api::handlers::files::delete_file,
        crate::web::api::handlers::files::get_file_metadata,
        crate::web::api::handlers::files::attach_file,
        crate::web::api::handlers::files::remove_file,
        // Submissions
        crate::web::api::handlers::submissions::list_user_submissions,
        crate::web::api::handlers::submissions::get_submission,
        crate::web::api::handlers::submissions::delete_submission,
        // Reports
        crate::web::api::handlers::reports::list_user_reports,
        crate::web::api::handlers::reports::list_reports,
        crate::web::api::handlers::reports::generate_report,
        crate::web::api::handlers::reports::get_report,
        crate::web::api::handlers::reports::delete_report,
        crate::web::api::handlers::reports::list_all_action_plans,
        crate::web::api::handlers::reports::list_all_reports,
        crate::web::api::handlers::reports::update_recommendation_status
        ,
        // Organizations
        crate::web::api::handlers::organizations::get_organizations,
        crate::web::api::handlers::organizations::create_organization,
        crate::web::api::handlers::organizations::get_organization_by_id,
        crate::web::api::handlers::organizations::update_organization,
        crate::web::api::handlers::organizations::delete_organization,
        crate::web::api::handlers::organizations::get_members,
        crate::web::api::handlers::organizations::add_member,
        crate::web::api::handlers::organizations::get_organizations_count,
        crate::web::api::handlers::organizations::get_member_organizations,
        crate::web::api::handlers::organizations::get_identity_providers,
        crate::web::api::handlers::organizations::add_identity_provider,
        crate::web::api::handlers::organizations::get_identity_provider,
        crate::web::api::handlers::organizations::remove_identity_provider,
        crate::web::api::handlers::organizations::get_members_count,
        crate::web::api::handlers::organizations::invite_existing_user,
        crate::web::api::handlers::organizations::invite_user,
        crate::web::api::handlers::organizations::get_member,
        crate::web::api::handlers::organizations::get_member_organizations_in_org,
        crate::web::api::handlers::organizations::remove_member,
        crate::web::api::handlers::organizations::get_org_admin_members,
        crate::web::api::handlers::organizations::remove_org_admin_member,
        crate::web::api::handlers::organizations::update_org_admin_member_categories
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
