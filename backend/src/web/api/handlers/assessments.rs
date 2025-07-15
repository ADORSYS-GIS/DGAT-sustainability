use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

// Helper function to convert file::Model to FileMetadata
async fn convert_file_model_to_metadata(
    file_model: crate::common::database::entity::file::Model,
) -> FileMetadata {
    // Extract metadata fields from the JSON metadata
    let default_map = serde_json::Map::new();
    let metadata_obj = file_model.metadata.as_object().unwrap_or(&default_map);

    let filename = metadata_obj
        .get("filename")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let size = metadata_obj
        .get("size")
        .and_then(|v| v.as_i64())
        .unwrap_or(file_model.content.len() as i64);

    let content_type = metadata_obj
        .get("content_type")
        .and_then(|v| v.as_str())
        .unwrap_or("application/octet-stream")
        .to_string();

    let created_at = metadata_obj
        .get("created_at")
        .and_then(|v| v.as_str())
        .unwrap_or(&chrono::Utc::now().to_rfc3339())
        .to_string();

    FileMetadata {
        file_id: file_model.id,
        filename,
        size,
        content_type,
        created_at,
        metadata: Some(file_model.metadata),
    }
}

// Helper function to fetch files for a response
async fn fetch_files_for_response(
    app_state: &AppState,
    response_id: Uuid,
) -> Result<Vec<FileMetadata>, ApiError> {
    let file_models = app_state
        .database
        .assessments_response_file
        .get_files_for_response(response_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch files for response: {e}"))
        })?;

    let mut files = Vec::new();
    for file_model in file_models {
        files.push(convert_file_model_to_metadata(file_model).await);
    }

    Ok(files)
}

#[derive(Debug, Deserialize)]
pub struct AssessmentQuery {
    status: Option<String>,
}

pub async fn list_assessments(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AssessmentQuery>,
) -> Result<Json<AssessmentListResponse>, ApiError> {
    let user_id = &claims.sub;

    // Fetch assessments from the database for the current user
    let assessment_models = app_state
        .database
        .assessments
        .get_assessments_by_user(user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessments: {e}")))?;

    // Convert database models to API models
    let mut assessments = Vec::new();
    for model in assessment_models {
        // Determine status based on whether assessment has been submitted
        let has_submission = app_state
            .database
            .assessments_submission
            .get_submission_by_assessment_id(model.assessment_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
            })?
            .is_some();

        let status = if has_submission {
            "submitted".to_string()
        } else {
            "draft".to_string()
        };

        assessments.push(Assessment {
            assessment_id: model.assessment_id,
            user_id: model.user_id,
            language: model.language,
            status,
            created_at: model.created_at.to_rfc3339(),
            updated_at: model.created_at.to_rfc3339(),
        });
    }

    // Filter by status if specified
    let filtered_assessments = if let Some(status) = &query.status {
        assessments
            .into_iter()
            .filter(|a| a.status == *status)
            .collect()
    } else {
        assessments
    };

    Ok(Json(AssessmentListResponse {
        assessments: filtered_assessments,
    }))
}

pub async fn create_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let user_id = claims.sub.clone();

    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Language must not be empty".to_string(),
        ));
    }

    // Create the assessment in the database
    let assessment_model = app_state
        .database
        .assessments
        .create_assessment(user_id, request.language)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create assessment: {e}")))?;

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status: "draft".to_string(),
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(AssessmentResponse { assessment })))
}

pub async fn get_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<AssessmentWithResponsesResponse>, ApiError> {
    let user_id = &claims.sub;

    // Fetch the assessment from the database
    let assessment_model = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Verify that the current user is the owner of the assessment
    if assessment_model.user_id != *user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to access this assessment".to_string(),
        ));
    }

    // Determine status based on whether assessment has been submitted
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    let status = if has_submission {
        "submitted".to_string()
    } else {
        "draft".to_string()
    };

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status,
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    // Fetch the latest responses for this assessment
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch assessment responses: {e}"))
        })?;

    // Convert response models to API models
    let mut responses = Vec::new();
    for response_model in response_models {
        let files = fetch_files_for_response(&app_state, response_model.response_id).await?;

        // Parse response from JSON string to Vec<String>
        let response_array: Vec<String> = serde_json::from_str(&response_model.response)
            .unwrap_or_else(|_| vec![response_model.response.clone()]);

        responses.push(Response {
            response_id: response_model.response_id,
            assessment_id: response_model.assessment_id,
            question_revision_id: response_model.question_revision_id,
            response: response_array,
            version: response_model.version,
            updated_at: response_model.updated_at.to_rfc3339(),
            files,
        });
    }

    Ok(Json(AssessmentWithResponsesResponse {
        assessment,
        responses,
    }))
}

pub async fn update_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<UpdateAssessmentRequest>,
) -> Result<Json<AssessmentResponse>, ApiError> {
    let user_id = &claims.sub;

    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Language must not be empty".to_string(),
        ));
    }

    // First, fetch the assessment to verify ownership and status
    let existing_assessment = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let existing_assessment = match existing_assessment {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Verify that the current user is the owner of the assessment
    if existing_assessment.user_id != *user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to update this assessment".to_string(),
        ));
    }

    // Check if assessment has been submitted (cannot update submitted assessments)
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    if has_submission {
        return Err(ApiError::BadRequest(
            "Cannot update a submitted assessment".to_string(),
        ));
    }

    // Update the assessment in the database
    let assessment_model = app_state
        .database
        .assessments
        .update_assessment(assessment_id, Some(request.language))
        .await
        .map_err(|e| {
            if e.to_string().contains("Assessment not found") {
                ApiError::NotFound("Assessment not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update assessment: {e}"))
            }
        })?;

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status: "draft".to_string(),
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    Ok(Json(AssessmentResponse { assessment }))
}

pub async fn delete_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let user_id = &claims.sub;

    // Check if the assessment exists and get its details
    let assessment = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment = match assessment {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Verify that the current user is the owner of the assessment
    if assessment.user_id != *user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to delete this assessment".to_string(),
        ));
    }

    // Check if assessment has been submitted (cannot delete submitted assessments)
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    if has_submission {
        return Err(ApiError::BadRequest(
            "Cannot delete a submitted assessment".to_string(),
        ));
    }

    // Delete the assessment from the database (this will cascade delete responses due to foreign key)
    app_state
        .database
        .assessments
        .delete_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete assessment: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn submit_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    let user_id = claims.sub.clone();

    // Verify that the assessment exists and belongs to the user
    let assessment_model = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Verify that the current user is the owner of the assessment
    if assessment_model.user_id != user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to submit this assessment".to_string(),
        ));
    }

    // Check if assessment has already been submitted
    let existing_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check existing submission: {e}"))
        })?;

    if existing_submission.is_some() {
        return Err(ApiError::BadRequest(
            "Assessment has already been submitted".to_string(),
        ));
    }

    // Fetch all responses for this assessment to include in the submission
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch assessment responses: {e}"))
        })?;

    // Build the submission content with file metadata
    let mut responses_with_files = Vec::new();
    for response_model in &response_models {
        // Fetch files associated with this response
        let files = app_state
            .database
            .assessments_response_file
            .get_files_for_response(response_model.response_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch files for response: {e}"))
            })?;

        // Convert file models to metadata
        let file_metadata: Vec<serde_json::Value> = files.iter().map(|file| {
            let empty_map = serde_json::Map::new();
            let metadata = file.metadata.as_object().unwrap_or(&empty_map);
            serde_json::json!({
                "file_id": file.id,
                "filename": metadata.get("filename").and_then(|v| v.as_str()).unwrap_or("unknown"),
                "size": metadata.get("size").and_then(|v| v.as_i64()).unwrap_or(file.content.len() as i64),
                "content_type": metadata.get("content_type").and_then(|v| v.as_str()).unwrap_or("application/octet-stream"),
                "created_at": metadata.get("created_at").and_then(|v| v.as_str()).unwrap_or(&chrono::Utc::now().to_rfc3339()),
                "metadata": file.metadata
            })
        }).collect();

        responses_with_files.push(serde_json::json!({
            "question_revision_id": response_model.question_revision_id,
            "response": response_model.response,
            "version": response_model.version,
            "files": file_metadata
        }));
    }

    let submission_content = serde_json::json!({
        "assessment": {
            "assessment_id": assessment_id,
            "language": assessment_model.language
        },
        "responses": responses_with_files
    });

    // Start a database transaction to ensure atomicity
    let txn = app_state
        .database
        .get_connection()
        .begin()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to start transaction: {e}")))?;

    // Create the submission record in the database within the transaction
    let submission_result = {
        use sea_orm::{ActiveModelTrait, Set};
        use crate::common::database::entity::assessments_submission::ActiveModel;

        let submission = ActiveModel {
            assessment_id: Set(assessment_id),
            user_id: Set(user_id.clone()),
            content: Set(submission_content.clone()),
            submitted_at: Set(chrono::Utc::now()),
        };

        submission.insert(&txn).await
    };

    let _submission_model = match submission_result {
        Ok(model) => model,
        Err(e) => {
            // Rollback transaction on submission creation failure
            if let Err(rollback_err) = txn.rollback().await {
                warn!("Failed to rollback transaction: {}", rollback_err);
            }
            return Err(ApiError::InternalServerError(format!("Failed to create submission: {e}")));
        }
    };

    // Delete the assessment after successful submission within the same transaction
    // This ensures that any remaining assessment responses are always in draft state
    let delete_result = {
        use crate::common::database::entity::assessments::{Entity as AssessmentEntity};

        AssessmentEntity::delete_by_id(assessment_id)
            .exec(&txn)
            .await
    };

    match delete_result {
        Ok(_) => {
            // Commit the transaction if both operations succeeded
            if let Err(e) = txn.commit().await {
                return Err(ApiError::InternalServerError(format!("Failed to commit transaction: {e}")));
            }
        }
        Err(e) => {
            // Rollback transaction on assessment deletion failure
            if let Err(rollback_err) = txn.rollback().await {
                warn!("Failed to rollback transaction: {}", rollback_err);
            }
            return Err(ApiError::InternalServerError(format!(
                "Failed to delete assessment after submission: {e}"
            )));
        }
    }

    // Build the response
    let now = chrono::Utc::now().to_rfc3339();
    let submission = AssessmentSubmission {
        assessment_id,
        user_id,
        content: submission_content,
        submitted_at: now,
        review_status: "pending_review".to_string(),
        reviewed_at: None,
    };

    Ok((
        StatusCode::CREATED,
        Json(AssessmentSubmissionResponse { submission }),
    ))
}
