use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{AssessmentSubmission, Submission, SubmissionDetailResponse, SubmissionListResponse};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use uuid::Uuid;

/// Enhance submission content by fetching question data for each question_revision_id
async fn enhance_submission_content_with_questions(
    app_state: &AppState,
    content: serde_json::Value,
) -> Result<serde_json::Value, ApiError> {
    let mut enhanced_content = content.clone();

    // Parse the content to extract responses
    if let Some(content_obj) = enhanced_content.as_object_mut() {
        if let Some(responses) = content_obj.get_mut("responses") {
            if let Some(responses_array) = responses.as_array_mut() {
                // Process each response to add question data
                for response in responses_array.iter_mut() {
                    if let Some(response_obj) = response.as_object_mut() {
                        // Extract question_revision_id
                        if let Some(question_revision_id_value) = response_obj.get("question_revision_id") {
                            if let Some(question_revision_id_str) = question_revision_id_value.as_str() {
                                if let Ok(question_revision_id) = Uuid::parse_str(question_revision_id_str) {
                                    // Fetch question data from database
                                    match app_state
                                        .database
                                        .questions_revisions
                                        .get_revision_by_id(question_revision_id)
                                        .await
                                    {
                                        Ok(Some(question_revision)) => {
                                            // Add question data to the response
                                            response_obj.insert(
                                                "question".to_string(),
                                                serde_json::json!({
                                                    "question_id": question_revision.question_id,
                                                    "question_revision_id": question_revision.question_revision_id,
                                                    "text": question_revision.text,
                                                    "weight": question_revision.weight,
                                                    "created_at": question_revision.created_at.to_rfc3339()
                                                })
                                            );
                                        }
                                        Ok(None) => {
                                            // Question revision not found, add placeholder
                                            response_obj.insert(
                                                "question".to_string(),
                                                serde_json::json!({
                                                    "question_id": null,
                                                    "question_revision_id": question_revision_id,
                                                    "text": {"en": "Question not found"},
                                                    "weight": 0.0,
                                                    "created_at": null
                                                })
                                            );
                                        }
                                        Err(e) => {
                                            return Err(ApiError::InternalServerError(
                                                format!("Failed to fetch question data: {e}")
                                            ));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(enhanced_content)
}

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
        // Enhance the content with question data
        let enhanced_content = enhance_submission_content_with_questions(
            &app_state,
            model.content.clone(),
        ).await?;

        submissions.push(Submission {
            submission_id: model.submission_id,
            user_id: model.user_id,
            content: enhanced_content,
            submitted_at: model.submitted_at.to_rfc3339(),
            review_status: model.status.to_string(),
            reviewed_at: model.reviewed_at.map(|dt| dt.to_rfc3339()),
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

    // Enhance the content with question data
    let enhanced_content = enhance_submission_content_with_questions(
        &app_state,
        submission_model.content.clone(),
    ).await?;

    // Convert database model to API model
    let submission = AssessmentSubmission {
        assessment_id: submission_model.submission_id,
        user_id: submission_model.user_id,
        content: enhanced_content,
        submitted_at: submission_model.submitted_at.to_rfc3339(),
        review_status: submission_model.status.to_string(),
        reviewed_at: submission_model.reviewed_at.map(|dt| dt.to_rfc3339()),
    };

    Ok(Json(SubmissionDetailResponse { submission }))
}
