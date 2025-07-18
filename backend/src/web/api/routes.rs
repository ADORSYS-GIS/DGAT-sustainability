
use crate::web::api::handlers::{
    admin::list_all_submissions,
    assessments::{
        create_assessment, delete_assessment, get_assessment, list_assessments, submit_assessment,
        update_assessment,
    },
    files::{attach_file, delete_file, download_file, get_file_metadata, remove_file, upload_file},
    health::{health_check, metrics},
    organizations::{
        add_member, create_invitation, create_organization, delete_invitation, delete_organization,
        get_invitations, get_members, get_organization, get_organizations, remove_member,
        update_member_roles, update_organization,
    },
    questions::{create_question, delete_question_revision_by_id, get_question, list_questions, update_question},
    reports::{delete_report, generate_report, get_report, list_reports, list_user_reports},
    responses::{create_response, delete_response, get_response, list_responses, update_response},
    submissions::{get_submission, list_user_submissions},
};

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use crate::web::routes::AppState;

pub fn create_router(app_state: AppState) -> Router {
    Router::new()
        // Health endpoints
        .route("/api/health", get(health_check))
        .route("/api/metrics", get(metrics))
        // Organization endpoints
        .route("/api/organizations", get(get_organizations))
        .route("/api/organizations", post(create_organization))
        .route("/api/organizations/:id", get(get_organization))
        .route("/api/organizations/:id", put(update_organization))
        .route("/api/organizations/:id", delete(delete_organization))
        .route("/api/organizations/:id/members", get(get_members))
        .route("/api/organizations/:id/members", post(add_member))
        .route("/api/organizations/:id/members/:membership_id", delete(remove_member))
        .route("/api/organizations/:id/members/:membership_id/roles", put(update_member_roles))
        .route("/api/organizations/:id/invitations", get(get_invitations))
        .route("/api/organizations/:id/invitations", post(create_invitation))
        .route("/api/organizations/:id/invitations/:invitation_id", delete(delete_invitation))
        // Question endpoints
        .route("/api/questions", get(list_questions))
        .route("/api/questions", post(create_question))
        .route("/api/questions/:question_id", get(get_question))
        .route("/api/questions/:question_id", put(update_question))
        .route("/api/questions/revisions/:revision_id", delete(delete_question_revision_by_id))
        // Assessment endpoints
        .route("/api/assessments", get(list_assessments))
        .route("/api/assessments", post(create_assessment))
        .route("/api/assessments/:assessment_id", get(get_assessment))
        .route("/api/assessments/:assessment_id", put(update_assessment))
        .route("/api/assessments/:assessment_id", delete(delete_assessment))
        .route(
            "/api/assessments/:assessment_id/submit",
            post(submit_assessment),
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
        // User submission endpoints
        .route("/api/submissions", get(list_user_submissions))
        .route("/api/submissions/:submission_id", get(get_submission))
        // User report endpoints
        .route("/api/user/reports", get(list_user_reports))
        // Report endpoints
        .route(
            "/api/submissions/:submission_id/reports",
            get(list_reports),
        )
        .route(
            "/api/submissions/:submission_id/reports",
            post(generate_report),
        )
        .route("/api/reports/:report_id", get(get_report))
        .route("/api/reports/:report_id", delete(delete_report))
        .with_state(app_state)
}
