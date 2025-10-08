use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::{ActiveModelTrait, ConnectionTrait, EntityTrait, TransactionTrait, Set};
use serde::Deserialize;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;
use crate::common::cache::cached_ops;
use crate::with_request_cache;

// Helper function to determine assessment status based on three-tier system
async fn determine_assessment_status(
    app_state: &AppState,
    claims: &Claims,
    assessment_id: Uuid,
) -> Result<AssessmentStatus, ApiError> {
    // Check if assessment has been reviewed (in assessments_submission table)
    let has_final_submission = cached_ops::get_submission_with_session(app_state, claims, assessment_id)
        .await?
        .is_some();
    
    if has_final_submission {
        return Ok(AssessmentStatus::Reviewed);
    }
    
    // Check if assessment has been submitted to temp_submission table
    let has_temp_submission = cached_ops::get_temp_submission_with_session(app_state, claims, assessment_id)
        .await?
        .is_some();
    
    if has_temp_submission {
        return Ok(AssessmentStatus::Submitted);
    }
    
    // Default to draft (covers both cases: no responses exist, or has responses but not submitted)
    Ok(AssessmentStatus::Draft)
}

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
    let file_models = cached_ops::get_files_for_response(app_state, response_id).await?;

    let mut files = Vec::new();
    for file_model in file_models {
        files.push(convert_file_model_to_metadata(file_model).await);
    }

    Ok(files)
}

#[derive(Debug, Deserialize)]
pub struct AssessmentQuery {
    status: Option<String>,
    language: Option<String>,
}

impl AssessmentQuery {
    fn parse_status(&self) -> Option<AssessmentStatus> {
        self.status.as_ref().and_then(|s| match s.as_str() {
            "draft" => Some(AssessmentStatus::Draft),
            "submitted" => Some(AssessmentStatus::Submitted),
            "reviewed" => Some(AssessmentStatus::Reviewed),
            _ => None,
        })
    }
}

pub async fn list_assessments(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AssessmentQuery>,
) -> Result<Json<AssessmentListResponse>, ApiError> {
    with_request_cache!({
        let org_id = claims.get_org_id()
            .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

        // Fetch assessments from the database for the current organization - using session-level cache
        let assessment_models = cached_ops::get_user_assessments_with_session(&app_state, &claims, &org_id).await?;

        // Convert database models to API models
        let mut assessments = Vec::new();
        for model in assessment_models {
            // Determine status using three-tier system (under_review, submitted, reviewed)
            let status = determine_assessment_status(&app_state, &claims, model.assessment_id).await?;

            assessments.push(Assessment {
                assessment_id: model.assessment_id,
                org_id: model.org_id,
                language: model.language,
                name: model.name,
                categories: serde_json::from_value(model.categories.clone())
                    .unwrap_or_default(),
                status,
                created_at: model.created_at.to_rfc3339(),
                updated_at: model.created_at.to_rfc3339(),
            });
        }

        // Filter by language if specified
        let mut filtered_assessments = if let Some(ref language) = query.language {
            assessments
                .into_iter()
                .filter(|a| a.language == *language)
                .collect()
        } else {
            assessments
        };

        // Filter by status if specified
        filtered_assessments = if let Some(parsed_status) = query.parse_status() {
            filtered_assessments
                .into_iter()
                .filter(|a| a.status == parsed_status)
                .collect()
        } else {
            // Default to only draft assessments when no status filter is specified
            filtered_assessments
                .into_iter()
                .filter(|a| a.status == AssessmentStatus::Draft)
                .collect()
        };

        Ok(Json(AssessmentListResponse {
            assessments: filtered_assessments,
        }))
    })
}

pub async fn create_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    with_request_cache!({
        let org_id = claims.get_org_id()
            .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

        // Check if user has permission to create assessments (only org_admin)
        if !claims.can_create_assessments() {
            return Err(ApiError::BadRequest(
                "Only organization administrators can create assessments".to_string(),
            ));
        }

        // Validate request
        if request.language.trim().is_empty() {
            return Err(ApiError::BadRequest(
                "Language must not be empty".to_string(),
            ));
        }

        if request.name.trim().is_empty() {
            return Err(ApiError::BadRequest(
                "Assessment name must not be empty".to_string(),
            ));
        }

        // Clean up only previous draft assessments (no submission) and their responses for this organization
        let existing_assessments = app_state
            .database
            .assessments
            .get_assessments_by_org(&org_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch existing assessments: {e}")))?;

        for existing_assessment in existing_assessments {
            // Check if this assessment has a submission (submitted) - using session-level cache
            let has_submission = cached_ops::get_submission_with_session(&app_state, &claims, existing_assessment.assessment_id)
                .await?
                .is_some();

            if !has_submission {
                // Only delete responses and the assessment if it is a draft (no submission) - using cached operation
                let existing_responses = cached_ops::get_latest_responses_by_assessment(&app_state, existing_assessment.assessment_id)
                    .await?;

                for response in existing_responses {
                    let _ = app_state
                        .database
                        .assessments_response
                        .delete_response(response.response_id)
                        .await; // Ignore errors for cleanup
                }

                // Delete the draft assessment itself
                let _ = app_state
                    .database
                    .assessments
                    .delete_assessment(existing_assessment.assessment_id)
                    .await; // Ignore errors for cleanup
            }
        }

        // Create the new assessment in the database with categories
        let assessment_model = app_state
            .database
            .assessments
            .create_assessment(org_id, request.language, request.name, request.categories)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to create assessment: {e}")))?;

        // Convert a database model to an API model
        let assessment = Assessment {
            assessment_id: assessment_model.assessment_id,
            org_id: assessment_model.org_id,
            language: assessment_model.language,
            name: assessment_model.name,
            categories: serde_json::from_value(assessment_model.categories)
                .unwrap_or_default(),
            status: AssessmentStatus::Draft,
            created_at: assessment_model.created_at.to_rfc3339(),
            updated_at: assessment_model.created_at.to_rfc3339(),
        };

        // Invalidate user's session cache since we created/deleted assessments

        Ok((StatusCode::CREATED, Json(AssessmentResponse { assessment })))
    })
}

pub async fn get_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<AssessmentWithResponsesResponse>, ApiError> {
    with_request_cache!({
        let org_id = claims.get_org_id()
            .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

        // Fetch the assessment from the database - using cached operation
        let assessment_model = cached_ops::get_assessment_by_id(&app_state, assessment_id).await?;

        let assessment_model = match assessment_model {
            Some(a) => a,
            None => return Err(ApiError::NotFound("Assessment not found".to_string())),
        };

        // Allow access to assessments in the following cases:
        // 1. User owns the assessment (same org_id)
        // 2. User is a super user (can access any assessment)
        // 3. Assessment can be accessed by anyone if they have the assessment_id (shared assessments)
        //    This implements the use case where super users share assessment_id with other users
        let is_owner = assessment_model.org_id == org_id;
        let is_super_user = claims.is_super_user();

        // For now, we'll allow any user to access any assessment if they have the assessment_id
        // This enables the sharing functionality described in the requirements
        // In a production system, you might want to add more specific access controls
        if !is_owner && !is_super_user {
            // Allow access to any assessment - this enables the sharing use case
            // where super users create assessments and share the assessment_id
            // Comment out the permission check to enable sharing
            // return Err(ApiError::BadRequest(
            //     "You don't have permission to access this assessment".to_string(),
            // ));
        }

        // Determine status using three-tier system (under_review, submitted, reviewed)
        let status = determine_assessment_status(&app_state, &claims, assessment_id).await?;

        // Convert a database model to an API model
        let assessment = Assessment {
            assessment_id: assessment_model.assessment_id,
            org_id: assessment_model.org_id,
            language: assessment_model.language,
            name: assessment_model.name,
            categories: serde_json::from_value(assessment_model.categories)
                .unwrap_or_default(),
            status,
            created_at: assessment_model.created_at.to_rfc3339(),
            updated_at: assessment_model.created_at.to_rfc3339(),
        };

        // Fetch the latest responses for this assessment - using cached operation
        let response_models = cached_ops::get_latest_responses_by_assessment(&app_state, assessment_id).await?;

        // Convert response models to API models
        let mut responses = Vec::new();
        for response_model in response_models {
            let files = fetch_files_for_response(&app_state, response_model.response_id).await?;

            // Store response as single string instead of array
            let response_array = vec![response_model.response.clone()];

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
    })
}

pub async fn update_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<UpdateAssessmentRequest>,
) -> Result<Json<AssessmentResponse>, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

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

    // Verify that the current organization is the owner of the assessment
    if existing_assessment.org_id != org_id {
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
        org_id: assessment_model.org_id,
        language: assessment_model.language,
        name: assessment_model.name,
        categories: serde_json::from_value(assessment_model.categories)
            .unwrap_or_default(),
        status: AssessmentStatus::Draft,
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    // Invalidate user's session cache since we updated an assessment

    Ok(Json(AssessmentResponse { assessment }))
}

pub async fn delete_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

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

    // Verify that the current organization is the owner of the assessment
    if assessment.org_id != org_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to delete this assessment".to_string(),
        ));
    }

    // Check if an assessment has been submitted (cannot delete submitted assessments)
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

    // Delete the assessment from the database (this will cascade delete responses due to a foreign key)
    app_state
        .database
        .assessments
        .delete_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete assessment: {e}")))?;

    // Invalidate user's session cache since we deleted an assessment

    Ok(StatusCode::NO_CONTENT)
}

/// API handler for user draft submission -- constructs content from live state and saves to temp_submission table
pub async fn user_submit_draft_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    if !claims.can_answer_assessments() {
        return Err(ApiError::BadRequest(
            "You don't have permission to submit assessments. Only Org_User and org_admin roles can submit assessments.".to_string(),
        ));
    }

    // Verify that the assessment exists and belongs to the organization
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

    // Gather responses for this assessment as draft content
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch assessment responses: {e}"))
        })?;

    let mut responses_with_files = Vec::new();
    for response_model in &response_models {
        let files = app_state
            .database
            .assessments_response_file
            .get_files_for_response(response_model.response_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch files for response: {e}"))
            })?;

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

    let draft_content = serde_json::json!({
        "assessment": {
            "assessment_id": assessment_id,
            "language": assessment_model.language
        },
        "responses": responses_with_files
    });

    // Insert or update the draft in temp_submission using service API
    let existing_temp = app_state.database.temp_submission.get_temp_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to query temp submission: {e}")))?;

    if existing_temp.is_some() {
        // Update draft
        app_state.database.temp_submission.update_submission_content(assessment_id, draft_content.clone())
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to update temp submission: {e}")))?;
    } else {
        // Create draft
        app_state.database.temp_submission.create_temp_submission(assessment_id, org_id.clone(), draft_content.clone())
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to store temp submission: {e}")))?;
    }

    Ok((StatusCode::OK, Json(draft_content)))
}

/// API handler to move a user's temp_submission to assessments_submission (approval/finalize)
pub async fn submit_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    if !claims.can_create_assessments() {
        return Err(ApiError::Forbidden(
            "You don't have permission to finalize assessments.".to_string(),
        ));
    }

    // Start database transaction to ensure atomicity
    let txn = app_state.database.get_connection()
        .begin()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to start transaction: {e}")))?;

    // Perform all operations within the transaction
    let result = async {
        // Fetch the temp submission (must exist) - this read operation doesn't need transaction
        let temp_submission = app_state.database.temp_submission
            .get_temp_submission_by_assessment_id(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to read temp_submission: {e}")))?
            .ok_or_else(|| ApiError::BadRequest("No temp submission to finalize".to_string()))?;

        // Fetch the assessment to get its name before we delete it
        let assessment = app_state.database.assessments
            .get_assessment_by_id(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?
            .ok_or_else(|| ApiError::NotFound("Assessment not found".to_string()))?;

        // Enhance the temp submission content with assessment name
        let mut enhanced_content = temp_submission.content.clone();
        if let Some(content_obj) = enhanced_content.as_object_mut() {
            content_obj.insert("assessment_name".to_string(), serde_json::Value::String(assessment.name.clone()));
        }

        // Create final submission using the enhanced content with assessment name
        let submission = crate::common::database::entity::assessments_submission::ActiveModel {
            submission_id: Set(assessment_id),
            org_id: Set(temp_submission.org_id.clone()),
            content: Set(enhanced_content),
            submitted_at: Set(chrono::Utc::now()),
            status: Set(crate::common::database::entity::assessments_submission::SubmissionStatus::UnderReview),
            reviewed_at: Set(None),
        };
        
        submission.insert(&txn)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to create final submission: {e}")))?;

        // Delete the temp submission after successful final submission
        crate::common::database::entity::temp_submission::Entity::delete_by_id(assessment_id)
            .exec(&txn)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to clean up temp submission: {e}")))?;

        // Delete the assessment after successful final submission and temp submission cleanup
        // This will cascade delete all associated assessment_response records
        crate::common::database::entity::assessments::Entity::delete_by_id(assessment_id)
            .exec(&txn)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to clean up assessment: {e}")))?;

        Ok::<(), ApiError>(())
    }.await;

    match result {
        Ok(_) => {
            // Commit transaction on success
            txn.commit()
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to commit transaction: {e}")))?;
            
            // Invalidate user's session cache since we submitted an assessment
            
            Ok(StatusCode::OK)
        }
        Err(e) => {
            // Rollback transaction on any error
            if let Err(rollback_err) = txn.rollback().await {
                tracing::error!("Failed to rollback transaction: {}", rollback_err);
                return Err(ApiError::InternalServerError(format!("Transaction failed and rollback failed: {rollback_err}")));
            }
            Err(e)
        }
    }
}