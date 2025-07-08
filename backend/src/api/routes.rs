use crate::common::state::AppState;
use crate::api::handlers::{
    health::{health_check, metrics},
    questions::{list_questions, create_question, get_question, update_question, delete_question, get_question_revisions, get_question_revision},
    assessments::{list_assessments, create_assessment, get_assessment, update_assessment, delete_assessment, submit_assessment},
    responses::{list_responses, create_response, get_response, update_response, delete_response, get_response_history},
    files::{upload_file, download_file, delete_file, get_file_metadata, attach_file, remove_file},
};
use axum::{
    routing::{delete, get, post, put},
    Router,
};


pub fn create_router(app_state: AppState) -> Router {
    Router::new()

        // Health endpoints
        .route("/api/health", get(health_check))
        .route("/api/metrics", get(metrics))
        // Question endpoints
        .route("/api/questions", get(list_questions))
        .route("/api/questions", post(create_question))
        .route("/api/questions/:question_id", get(get_question))
        .route("/api/questions/:question_id", put(update_question))
        .route("/api/questions/:question_id", delete(delete_question))
        .route("/api/questions/:question_id/revisions", get(get_question_revisions))
        .route("/api/questions/revisions/:revision_id", get(get_question_revision))

        // Assessment endpoints
        .route("/api/assessments", get(list_assessments))
        .route("/api/assessments", post(create_assessment))
        .route("/api/assessments/:assessment_id", get(get_assessment))
        .route("/api/assessments/:assessment_id", put(update_assessment))
        .route("/api/assessments/:assessment_id", delete(delete_assessment))
        .route("/api/assessments/:assessment_id/submit", post(submit_assessment))

        // Response endpoints
        .route("/api/assessments/:assessment_id/responses", get(list_responses))
        .route("/api/assessments/:assessment_id/responses", post(create_response))
        .route("/api/assessments/:assessment_id/responses/:response_id", get(get_response))
        .route("/api/assessments/:assessment_id/responses/:response_id", put(update_response))
        .route("/api/assessments/:assessment_id/responses/:response_id", delete(delete_response))
        .route("/api/assessments/:assessment_id/responses/:response_id/history", get(get_response_history))

        // File endpoints
        .route("/api/files", post(upload_file))
        .route("/api/files/:file_id", get(download_file))
        .route("/api/files/:file_id", delete(delete_file))
        .route("/api/files/:file_id/metadata", get(get_file_metadata))
        .route("/api/assessments/:assessment_id/responses/:response_id/files", post(attach_file))
        .route("/api/assessments/:assessment_id/responses/:response_id/files/:file_id", delete(remove_file))

        .with_state(app_state)
}
