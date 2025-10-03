use crate::web::api::handlers::{
    admin::{
        create_user_invitation, delete_user, get_user_invitation_status, list_all_submissions,
        list_temp_submissions_by_assessment,
    },
    assessments::{
        create_assessment, delete_assessment, get_assessment, list_assessments, submit_assessment,
        update_assessment, user_submit_draft_assessment,
    },
    categories::{
        create_category, delete_category, get_category, list_categories, update_category,
    },
    files::{attach_file, delete_file, download_file, get_file_metadata, remove_file, upload_file},
    health::{health_check, metrics},
    organization_categories::{
        assign_categories_to_organization, create_category_catalog, get_category_catalogs,
        get_organization_categories, update_organization_category,
    },
    organizations::{
        add_identity_provider, add_member, add_org_admin_member, create_organization,
        delete_organization, get_identity_provider, get_identity_providers, get_member,
        get_member_organizations, get_member_organizations_in_org, get_members, get_members_count,
        get_org_admin_members, get_organization, get_organizations, get_organizations_count,
        invite_existing_user, invite_user, remove_identity_provider, remove_member,
        remove_org_admin_member, update_org_admin_member_categories, update_organization,
    },
    questions::{
        create_question, delete_question_revision_by_id, get_question, list_questions,
        update_question,
    },
    reports::{
        delete_report, generate_report, get_report, list_all_action_plans, list_reports,
        list_user_reports, update_recommendation_status,
    },
    responses::{create_response, delete_response, get_response, list_responses, update_response},
    submissions::{delete_submission, get_submission, list_user_submissions},
};

use crate::web::routes::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

pub fn should_skip_validation(path: &str) -> bool {
    let public_paths = ["/health", "/docs", "/openapi-json", "/openapi-yaml"];
    public_paths.contains(&path)
}

pub fn create_router(app_state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health_check))
        .route("/api/metrics", get(metrics))
        // Organization endpoints matching OpenAPI specification
        .route("/api/admin/organizations", get(get_organizations))
        .route("/api/admin/organizations", post(create_organization))
        .route(
            "/admin/realms/:realm/organizations/count",
            get(get_organizations_count),
        )
        .route(
            "/admin/realms/:member_id/organizations",
            get(get_member_organizations),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id",
            get(get_organization),
        )
        // The following endpoints expect only org_id as a path parameter
        .route("/api/admin/organizations/:org_id", put(update_organization))
        .route(
            "/api/admin/organizations/:org_id",
            delete(delete_organization),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/identity-providers",
            get(get_identity_providers),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/identity-providers",
            post(add_identity_provider),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/identity-providers/:alias",
            get(get_identity_provider),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/identity-providers/:alias",
            delete(remove_identity_provider),
        )
        .route("/api/organizations/:org_id/members", get(get_members))
        .route("/api/organizations/:org_id/members", post(add_member))
        .route(
            "/admin/realms/:realm/organizations/:org_id/members/count",
            get(get_members_count),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/members/invite-existing-user",
            post(invite_existing_user),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/members/invite-user",
            post(invite_user),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/members/:member_id",
            get(get_member),
        )
        .route(
            "/api/admin/organizations/:org_id/members/:member_id",
            delete(remove_member),
        )
        .route(
            "/admin/realms/:realm/organizations/:org_id/members/:member_id/organizations",
            get(get_member_organizations_in_org),
        )
        // Question endpoints
        .route("/api/questions", get(list_questions))
        .route("/api/questions", post(create_question))
        .route("/api/questions/:question_id", get(get_question))
        .route("/api/questions/:question_id", put(update_question))
        .route(
            "/api/questions/revisions/:revision_id",
            delete(delete_question_revision_by_id),
        )
        // Category endpoints
        .route("/api/categories", get(list_categories))
        .route("/api/categories", post(create_category))
        .route("/api/categories/:category_id", get(get_category))
        .route("/api/categories/:category_id", put(update_category))
        .route("/api/categories/:category_id", delete(delete_category))
        // Category Catalog endpoints
        .route("/api/category-catalog", get(get_category_catalogs))
        .route("/api/category-catalog", post(create_category_catalog))
        // Organization Categories endpoints
        .route("/api/organizations/:keycloak_organization_id/categories", get(get_organization_categories))
        .route("/api/organizations/:keycloak_organization_id/categories/assign", post(assign_categories_to_organization))
        .route("/api/organizations/:keycloak_organization_id/categories/:organization_category_id", put(update_organization_category))
        // Assessment endpoints (org-scoped)
        .route("/api/assessments", get(list_assessments))
        .route("/api/assessments", post(create_assessment))
        .route("/api/assessments/:assessment_id", get(get_assessment))
        .route("/api/assessments/:assessment_id", put(update_assessment))
        .route("/api/assessments/:assessment_id", delete(delete_assessment))
        .route(
            "/api/assessments/:assessment_id/submit",
            post(submit_assessment),
        )
        .route(
            "/api/assessments/:assessment_id/draft",
            post(user_submit_draft_assessment),
        )
        // Response endpoints
        .route(
            "/api/assessments/:assessment_id/responses",
            get(list_responses),
        )
        .route(
            "/api/assessments/:assessment_id/responses",
            post(create_response),
        )
        .route(
            "/api/assessments/:assessment_id/responses/:response_id",
            get(get_response),
        )
        .route(
            "/api/assessments/:assessment_id/responses/:response_id",
            put(update_response),
        )
        .route(
            "/api/assessments/:assessment_id/responses/:response_id",
            delete(delete_response),
        )
        // File endpoints
        .route("/api/files", post(upload_file))
        .route("/api/files/:file_id", get(download_file))
        .route("/api/files/:file_id", delete(delete_file))
        .route("/api/files/:file_id/metadata", get(get_file_metadata))
        .route(
            "/api/assessments/:assessment_id/responses/:response_id/files",
            post(attach_file),
        )
        .route(
            "/api/assessments/:assessment_id/responses/:response_id/files/:file_id",
            delete(remove_file),
        )
        // Admin endpoints
        .route("/api/admin/submissions", get(list_all_submissions))
        .route("/api/drafts", get(list_temp_submissions_by_assessment))
        // User submission endpoints
        .route("/api/submissions", get(list_user_submissions))
        .route("/api/submissions/:submission_id", get(get_submission))
        .route("/api/submissions/:submission_id", delete(delete_submission))
        // User report endpoints
        .route("/api/user/reports", get(list_user_reports))
        // Report endpoints
        .route("/api/submissions/:submission_id/reports", get(list_reports))
        .route(
            "/api/submissions/:submission_id/reports",
            post(generate_report),
        )
        .route("/api/reports/:report_id", get(get_report))
        .route("/api/reports/:report_id", delete(delete_report))
        .route("/api/admin/action-plans", get(list_all_action_plans))
        .route(
            "/api/reports/:report_id/recommendations/:category/status",
            put(update_recommendation_status),
        )
        .route(
            "/api/organizations/:org_id/org-admin/members",
            post(add_org_admin_member),
        )
        .route(
            "/api/organizations/:org_id/org-admin/members",
            get(get_org_admin_members),
        )
        .route(
            "/api/organizations/:org_id/org-admin/members/:member_id",
            delete(remove_org_admin_member),
        )
        .route(
            "/api/organizations/:org_id/org-admin/members/:member_id/categories",
            put(update_org_admin_member_categories),
        )
        // Org admin user invitation endpoints
        .route(
            "/openapi-json",
            get(crate::web::api::handlers::openapi::get_openapi_json),
        )
        // User invitation endpoints
        .route("/api/admin/user-invitations", post(create_user_invitation))
        .route(
            "/api/admin/user-invitations/:user_id/status",
            get(get_user_invitation_status),
        )
        // User management endpoints
        .route("/api/admin/users/:user_id", delete(delete_user))
        .with_state(app_state)
}
