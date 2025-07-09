use crate::web::api::error::ApiError;
use crate::web::api::models::{SubmissionListResponse, SubmissionDetailResponse, AssessmentSubmission};
use crate::common::models::claims::Claims;
use crate::common::state::AppState;
use axum::{extract::{Extension, Path, State}, Json};
use uuid::Uuid;
use chrono::Utc;

pub async fn list_user_submissions(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<SubmissionListResponse>, ApiError> {
    let user_id = &claims.sub;

    // Fetch user submissions from the database
    let submission_models = app_state.database.assessments_submission
        .get_submissions_by_user(user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch user submissions: {}", e)))?;

    // Convert database models to API models
    let mut submissions = Vec::new();
    for model in submission_models {
        submissions.push(AssessmentSubmission {
            assessment_id: model.assessment_id,
            user_id: model.user_id,
            content: model.content,
            submitted_at: chrono::Utc::now().to_rfc3339(), // In real implementation, this would come from a timestamp field
            review_status: "pending_review".to_string(), // In real implementation, this would come from a status field
            reviewed_at: None, // In real implementation, this would come from a timestamp field
        });
    }

    Ok(Json(SubmissionListResponse { submissions }))
}

pub async fn get_submission(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(submission_id): Path<Uuid>,
) -> Result<Json<SubmissionDetailResponse>, ApiError> {
    let user_id = &claims.sub;

    // In the database model, submission_id is actually the assessment_id (primary key)
    // Fetch the specific submission from the database
    let submission_model = app_state.database.assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {}", e)))?;

    let submission_model = match submission_model {
        Some(s) => s,
        None => return Err(ApiError::NotFound("Submission not found".to_string())),
    };

    // Verify that the current user is the owner of the submission
    if submission_model.user_id != *user_id {
        return Err(ApiError::BadRequest("You don't have permission to access this submission".to_string()));
    }

    // Convert database model to API model
    let submission = AssessmentSubmission {
        assessment_id: submission_model.assessment_id,
        user_id: submission_model.user_id,
        content: submission_model.content,
        submitted_at: chrono::Utc::now().to_rfc3339(), // In real implementation, this would come from a timestamp field
        review_status: "pending_review".to_string(), // In real implementation, this would come from a status field
        reviewed_at: None, // In real implementation, this would come from a timestamp field
    };

    Ok(Json(SubmissionDetailResponse { submission }))
}
