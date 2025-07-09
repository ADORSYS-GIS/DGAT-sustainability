use crate::common::state::AppState;
use crate::api::handlers::{
    health::{health_check, metrics},
    questions::{list_questions, create_question, get_question, update_question, delete_question},
    assessments::{list_assessments, create_assessment, get_assessment, update_assessment, delete_assessment, submit_assessment},
    responses::{list_responses, create_response, get_response, update_response, delete_response, get_response_history},
    files::{upload_file, download_file, delete_file, get_file_metadata, attach_file, remove_file},
    admin::{list_all_submissions, list_all_reviews, assign_reviewer},
    submissions::{list_user_submissions, get_submission},
    reviews::{get_submission_reviews, create_review, get_review, update_review},
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

        // Admin endpoints
        .route("/api/admin/submissions", get(list_all_submissions))
        .route("/api/admin/reviews", get(list_all_reviews))
        .route("/api/admin/reviews/assign", post(assign_reviewer))

        // User submission endpoints
        .route("/api/submissions", get(list_user_submissions))
        .route("/api/submissions/:submission_id", get(get_submission))

        // Review endpoints
        .route("/api/submissions/:submission_id/reviews", get(get_submission_reviews))
        .route("/api/submissions/:submission_id/reviews", post(create_review))
        .route("/api/reviews/:review_id", get(get_review))
        .route("/api/reviews/:review_id", put(update_review))

        .with_state(app_state)
}
