use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{AssessmentSubmission, Submission, SubmissionDetailResponse, SubmissionListResponse};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use tracing::log::warn;
use uuid::Uuid;

pub async fn list_user_submissions(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<SubmissionListResponse>, ApiError> {
    let user_id = &claims.sub;

    // Fetch user submissions from the database
    let submission_models = app_state
        .database
        .assessments_submission
        .get_submissions_by_user(user_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch user submissions: {e}"))
        })?;

    // Convert database models to API models
    let mut submissions = Vec::new();
    for model in submission_models {
        // Check if there's a report for this submission
        let report = app_state
            .database
            .submission_reports
            .get_report_by_assessment(model.submission_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to check for reports: {e}"))
            })?;

        // Determine review status based on report existence
        let (review_status, reviewed_at) = if let Some(_report) = report {
            // If a report exists, the submission is under review
            ("under_review".to_string(), None)
        } else {
            // If no report exists, the submission is pending review
            ("pending".to_string(), None)
        };

        submissions.push(Submission {
            submission_id: model.submission_id,
            user_id: model.user_id,
            content: model.content,
            submitted_at: model.submitted_at.to_rfc3339(),
            review_status,
            reviewed_at,
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
    let submission_model = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?;

    let submission_model = match submission_model {
        Some(s) => s,
        None => return Err(ApiError::NotFound("Submission not found".to_string())),
    };

    // Verify that the current user is the owner of the submission
    if submission_model.user_id != *user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to access this submission".to_string(),
        ));
    }

    // Check if there's a report for this submission
    let report = app_state
        .database
        .submission_reports
        .get_report_by_assessment(submission_model.submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to check for reports: {e}")))?;

    // Determine review status based on report existence
    let (review_status, reviewed_at) = if let Some(_report) = report {
        // If a report exists, the submission is under review
        ("under_review".to_string(), None)
    } else {
        // If no report exists, the submission is pending review
        ("pending".to_string(), None)
    };
    // Convert database model to API model
    let submission = AssessmentSubmission {
        assessment_id: submission_model.submission_id,
        user_id: submission_model.user_id,
        content: submission_model.content,
        submitted_at: submission_model.submitted_at.to_rfc3339(),
        review_status,
        reviewed_at,
    };

    Ok(Json(SubmissionDetailResponse { submission }))
}
