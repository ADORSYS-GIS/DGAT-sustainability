use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{AssessmentSubmission, Submission, SubmissionDetailResponse, SubmissionListResponse};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use uuid::Uuid;

/// Helper function to extract question revision ID from a response object
fn extract_question_revision_id(response_obj: &serde_json::Map<String, serde_json::Value>) -> Option<Uuid> {
    response_obj
        .get("question_revision_id")?
        .as_str()?
        .parse()
        .ok()
}

/// Helper function to create question data JSON
fn create_question_json(question_revision: &crate::common::database::entity::questions_revisions::Model) -> serde_json::Value {
    serde_json::json!({
        "question_id": question_revision.question_id,
        "question_revision_id": question_revision.question_revision_id,
        "text": question_revision.text,
        "weight": question_revision.weight,
        "created_at": question_revision.created_at.to_rfc3339()
    })
}

/// Helper function to create placeholder question JSON when question is not found
fn create_placeholder_question_json(question_revision_id: Uuid) -> serde_json::Value {
    serde_json::json!({
        "question_id": null,
        "question_revision_id": question_revision_id,
        "text": {"en": "Question not found"},
        "weight": 0.0,
        "created_at": null
    })
}

/// Process a single response to replace question_revision_id with question text and category
async fn process_response(
    app_state: &AppState,
    response_obj: &mut serde_json::Map<String, serde_json::Value>,
) -> Result<(), ApiError> {
    let question_revision_id = match extract_question_revision_id(response_obj) {
        Some(id) => id,
        None => return Ok(()), // Skip if no valid question_revision_id
    };

    // Fetch question text and category using question_revision_id
    let (question_text, question_category) = match app_state
        .database
        .questions_revisions
        .get_revision_by_id(question_revision_id)
        .await
    {
        Ok(Some(revision)) => {
            // Get the question to fetch category
            match app_state
                .database
                .questions
                .get_question_by_id(revision.question_id)
                .await
            {
                Ok(Some(question)) => {
                    // Use the revision text directly (it's already a JSON Value)
                    (revision.text, question.category)
                }
                _ => (serde_json::json!({"en": "Question not found"}), "Unknown".to_string()),
            }
        }
        Ok(None) => (serde_json::json!({"en": "Question not found"}), "Unknown".to_string()),
        Err(e) => {
            return Err(ApiError::InternalServerError(
                format!("Failed to fetch question data: {e}")
            ));
        }
    };

    // Remove question_revision_id and replace with question text and category
    response_obj.remove("question_revision_id");
    response_obj.insert("question".to_string(), question_text);
    response_obj.insert("question_category".to_string(), serde_json::Value::String(question_category));
    Ok(())
}

/// Enhance submission content by fetching question data for each question_revision_id
async fn enhance_submission_content_with_questions(
    app_state: &AppState,
    content: serde_json::Value,
) -> Result<serde_json::Value, ApiError> {
    let mut enhanced_content = content.clone();

    // Get responses array from content, return early if not found
    let responses_array = enhanced_content
        .as_object_mut()
        .and_then(|obj| obj.get_mut("responses"))
        .and_then(|responses| responses.as_array_mut());

    let responses_array = match responses_array {
        Some(array) => array,
        None => return Ok(enhanced_content), // No responses to process
    };

    // Process each response to add question data
    for response in responses_array.iter_mut() {
        if let Some(response_obj) = response.as_object_mut() {
            process_response(app_state, response_obj).await?;
        }
    }

    Ok(enhanced_content)
}

// Helper: check if user is member of org by org_id
fn is_member_of_org_by_id(claims: &crate::common::models::claims::Claims, org_id: &str) -> bool {
    // Application admins bypass organization membership checks
    if claims.is_application_admin() {
        return true;
    }
    claims.organizations.as_ref()
        .map(|orgs| orgs.orgs.values().any(|info| info.id.as_deref() == Some(org_id)))
        .unwrap_or(false)
}

pub async fn list_user_submissions(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<SubmissionListResponse>, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    // Fetch organization submissions from the database
    let submission_models = app_state
        .database
        .assessments_submission
        .get_submissions_by_org(&org_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch organization submissions: {e}"))
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
            org_id: model.org_id,
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
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

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

    // Verify that the current organization is the owner of the submission
    if submission_model.org_id != org_id {
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
        org_id: submission_model.org_id,
        content: enhanced_content,
        submitted_at: submission_model.submitted_at.to_rfc3339(),
        review_status: submission_model.status.to_string(),
        reviewed_at: submission_model.reviewed_at.map(|dt| dt.to_rfc3339()),
    };

    Ok(Json(SubmissionDetailResponse { submission }))
}
