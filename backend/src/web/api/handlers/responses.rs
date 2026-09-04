use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::common::access;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

/// Resolve the category_catalog_id UUID for a given question_revision_id.
/// Walks: question_revision -> question -> category_catalog_id
async fn get_category_id_for_revision(
    app_state: &AppState,
    question_revision_id: Uuid,
) -> Result<Option<Uuid>, ApiError> {
    let revision = app_state
        .database
        .questions_revisions
        .get_revision_by_id(question_revision_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revision: {e}")))?;

    let revision = match revision {
        Some(r) => r,
        None => return Ok(None),
    };

    let question = app_state
        .database
        .questions
        .get_question_by_id(revision.question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {e}")))?;

    Ok(question.map(|q| q.category_id))
}

/// For an org_admin caller, verify that none of the question_revision_ids being
/// answered belong to a category that has already been assigned to an Org_User
/// in this organization.
async fn enforce_org_admin_category_restriction(
    app_state: &AppState,
    org_id: &str,
    question_revision_ids: &[Uuid],
) -> Result<(), ApiError> {
    let assigned_ids = app_state
        .database
        .user_category_assignments
        .get_assigned_category_ids_for_org(org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category assignments: {e}")))?;

    if assigned_ids.is_empty() {
        return Ok(());
    }

    for &revision_id in question_revision_ids {
        if let Some(category_id) = get_category_id_for_revision(app_state, revision_id).await? {
            if assigned_ids.contains(&category_id) {
                return Err(ApiError::Forbidden(
                    "This category has been assigned to an organization user. \
                     The org admin cannot answer or edit questions in this category."
                        .to_string(),
                ));
            }
        }
    }

    Ok(())
}

/// Enforce that the caller is assigned to the assessment AND that every question
/// being answered belongs to a category the caller is allowed to answer.
async fn enforce_assignment_and_categories(
    app_state: &AppState,
    claims: &Claims,
    assessment_id: Uuid,
    question_revision_ids: &[Uuid],
) -> Result<(), ApiError> {
    let assessment = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Assessment not found".to_string()))?;

    let can_access = access::can_access_assessment(app_state, claims, &assessment.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Org_User: every answered question must belong to an assigned category (strict).
    if !claims.is_organization_admin() && !claims.is_application_admin() {
        let org_id = claims.get_org_id()
            .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;
        for &revision_id in question_revision_ids {
            if let Some(category_id) = get_category_id_for_revision(app_state, revision_id).await? {
                let allowed = access::can_answer_category(app_state, claims, &org_id, category_id).await?;
                if !allowed {
                    return Err(ApiError::Forbidden(
                        "You are not assigned to a category in this assessment".to_string(),
                    ));
                }
            }
        }
    }

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct ResponseHistoryResponse {
    pub response_id: Uuid,
    pub history: Vec<ResponseVersion>,
}

#[derive(Debug, Serialize)]
pub struct ResponseVersion {
    pub version: i32,
    pub response: String,
    pub updated_at: String,
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

/// List latest responses for an assessment
#[utoipa::path(
    get,
    path = "/assessments/{assessment_id}/responses",
    tag = "Response",
    params(("assessment_id" = uuid::Uuid, Path, description = "Assessment ID")),
    responses(
        (status = 200, description = "Responses list", body = ResponseListResponse),
        (status = 404, description = "Assessment not found")
    )
)]
pub async fn list_responses(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<ResponseListResponse>, ApiError> {
    // Verify that the current organization is the owner of the assessment
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

    let can_access = access::can_access_assessment(&app_state, &claims, &assessment_model.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Fetch the latest responses for the specified assessment from the database
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch responses: {e}")))?;

    // Convert database models to API models
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

    Ok(Json(ResponseListResponse { responses }))
}

/// Create or update responses for an assessment
#[utoipa::path(
    post,
    path = "/assessments/{assessment_id}/responses",
    tag = "Response",
    params(("assessment_id" = uuid::Uuid, Path, description = "Assessment ID")),
    request_body = Vec<CreateResponseRequest>,
    responses(
        (status = 201, description = "Responses stored", body = ResponseListResponse),
        (status = 400, description = "Validation or permission error"),
        (status = 404, description = "Assessment not found")
    )
)]
pub async fn create_response(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
    Json(requests): Json<Vec<CreateResponseRequest>>,
) -> Result<impl IntoResponse, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    // Validate requests
    if requests.is_empty() {
        return Err(ApiError::BadRequest(
            "At least one response is required".to_string(),
        ));
    }

    for request in &requests {
        if request.response.trim().is_empty() {
            return Err(ApiError::BadRequest(
                "Response must not be empty".to_string(),
            ));
        }
    }

    // Check if user has permission to answer assessments
    if !claims.can_answer_assessments() {
        return Err(ApiError::BadRequest(
            "You don't have permission to answer assessments. Only Org_User and org_admin roles can answer assessments.".to_string(),
        ));
    }

    // If the caller is an org_admin, block them from answering categories
    // that have been delegated to Org_Users in their organization.
    if claims.is_org_admin() && !claims.is_super_user() {
        let revision_ids: Vec<Uuid> = requests.iter().map(|r| r.question_revision_id).collect();
        enforce_org_admin_category_restriction(&app_state, &org_id, &revision_ids).await?;
    }

    // Enforce assignment + per-category scoping for all callers.
    let revision_ids: Vec<Uuid> = requests.iter().map(|r| r.question_revision_id).collect();
    enforce_assignment_and_categories(&app_state, &claims, assessment_id, &revision_ids).await?;

    // Verify that the current organization is the owner of the assessment
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

    let can_access = access::can_access_assessment(&app_state, &claims, &assessment_model.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Allow multiple users to answer the same assessment even if it has been submitted
    // This enables the use case where org_admin creates assessments and multiple Org_User users
    // can answer and submit responses to the same assessment

    // Get existing responses for this assessment
    let existing_responses = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch existing responses: {e}")))?;

    let mut updated_responses = Vec::new();

    // Process each request
    for request in requests {
        // Check if a response already exists for this question_revision_id
        if let Some(_existing) = existing_responses.iter().find(|r| r.question_revision_id == request.question_revision_id) {
            // Replace existing response with new one instead of appending
            let updated_response = app_state
                .database
                .assessments_response
                .update_response(
                    assessment_id,
                    request.question_revision_id,
                    request.response,
                )
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to update response: {e}")))?;

            updated_responses.push(updated_response);
        } else {
            // Create new response
            let new_response = app_state
                .database
                .assessments_response
                .create_response(
                    assessment_id,
                    request.question_revision_id,
                    request.response,
                    1,
                )
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to create response: {e}")))?;

            updated_responses.push(new_response);
        }
    }

    // Convert database models to API models
    let mut responses = Vec::new();
    for response_model in updated_responses {
        let files = fetch_files_for_response(&app_state, response_model.response_id).await?;

        // Store response as single string instead of array
        let response_array = vec![response_model.response.clone()];

        let response = Response {
            response_id: response_model.response_id,
            assessment_id: response_model.assessment_id,
            question_revision_id: response_model.question_revision_id,
            response: response_array,
            version: response_model.version,
            updated_at: response_model.updated_at.to_rfc3339(),
            files,
        };
        responses.push(response);
    }

    Ok((StatusCode::CREATED, Json(ResponseListResponse { responses })))
}

/// Get a response by ID
#[utoipa::path(
    get,
    path = "/assessments/{assessment_id}/responses/{response_id}",
    tag = "Response",
    params(
        ("assessment_id" = uuid::Uuid, Path, description = "Assessment ID"),
        ("response_id" = uuid::Uuid, Path, description = "Response ID")
    ),
    responses(
        (status = 200, description = "Response detail", body = ResponseResponse),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_response(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ResponseResponse>, ApiError> {
    // Verify that the current organization is the owner of the assessment
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

    let can_access = access::can_access_assessment(&app_state, &claims, &assessment_model.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Fetch the response from the database
    let response_model = app_state
        .database
        .assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {e}")))?;

    let response_model = match response_model {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if response_model.assessment_id != assessment_id {
        return Err(ApiError::BadRequest(
            "Response does not belong to the specified assessment".to_string(),
        ));
    }

    // Convert database model to API model
    let files = fetch_files_for_response(&app_state, response_model.response_id).await?;

    // Store response as single string instead of array
    let response_array = vec![response_model.response.clone()];

    let response = Response {
        response_id: response_model.response_id,
        assessment_id: response_model.assessment_id,
        question_revision_id: response_model.question_revision_id,
        response: response_array,
        version: response_model.version,
        updated_at: response_model.updated_at.to_rfc3339(),
        files,
    };

    Ok(Json(ResponseResponse { response }))
}

/// Update a response by ID
#[utoipa::path(
    put,
    path = "/assessments/{assessment_id}/responses/{response_id}",
    tag = "Response",
    params(
        ("assessment_id" = uuid::Uuid, Path, description = "Assessment ID"),
        ("response_id" = uuid::Uuid, Path, description = "Response ID")
    ),
    request_body = UpdateResponseRequest,
    responses(
        (status = 200, description = "Response updated", body = ResponseResponse),
        (status = 400, description = "Validation error"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_response(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
    Json(request): Json<UpdateResponseRequest>,
) -> Result<Json<ResponseResponse>, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    // Validate request
    if request.response.is_empty() || request.response.iter().all(|s| s.trim().is_empty()) {
        return Err(ApiError::BadRequest(
            "Response must not be empty".to_string(),
        ));
    }

    // Verify that the current organization is the owner of the assessment
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

    let can_access = access::can_access_assessment(&app_state, &claims, &assessment_model.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Verify that the assessment is in draft status (not submitted)
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
            "Cannot update response for a submitted assessment".to_string(),
        ));
    }

    // Fetch the existing response to get the question_revision_id
    let existing_response = app_state
        .database
        .assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {e}")))?;

    let existing_response = match existing_response {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if existing_response.assessment_id != assessment_id {
        return Err(ApiError::BadRequest(
            "Response does not belong to the specified assessment".to_string(),
        ));
    }

    // Enforce assignment + per-category scoping.
    enforce_assignment_and_categories(
        &app_state,
        &claims,
        assessment_id,
        &[existing_response.question_revision_id],
    )
    .await?;

    // If the caller is an org_admin, block them from editing questions in categories
    // that have been delegated to Org_Users in their organization.
    if claims.is_org_admin() && !claims.is_super_user() {
        enforce_org_admin_category_restriction(
            &app_state,
            &org_id,
            &[existing_response.question_revision_id],
        )
        .await?;
    }

    // Check for version conflicts
    if existing_response.version != request.version {
        return Err(ApiError::Conflict(
            "Version conflict: response has been modified by another user".to_string(),
        ));
    }

    // Convert Vec<String> to single string for database storage (take first response)
    let response_json = request.response.first().unwrap_or(&String::new()).clone();

    // Update the response in the database
    let updated_response = app_state
        .database
        .assessments_response
        .update_response(
            assessment_id,
            existing_response.question_revision_id,
            response_json,
        )
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to update response: {e}")))?;

    // Convert database model to API model
    let files = fetch_files_for_response(&app_state, updated_response.response_id).await?;

    // Store response as single string instead of array
    let response_array = vec![updated_response.response.clone()];

    let response = Response {
        response_id: updated_response.response_id,
        assessment_id: updated_response.assessment_id,
        question_revision_id: updated_response.question_revision_id,
        response: response_array,
        version: updated_response.version,
        updated_at: updated_response.updated_at.to_rfc3339(),
        files,
    };

    Ok(Json(ResponseResponse { response }))
}

/// Delete a response by ID
#[utoipa::path(
    delete,
    path = "/assessments/{assessment_id}/responses/{response_id}",
    tag = "Response",
    params(
        ("assessment_id" = uuid::Uuid, Path, description = "Assessment ID"),
        ("response_id" = uuid::Uuid, Path, description = "Response ID")
    ),
    responses(
        (status = 204, description = "Response deleted"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete_response(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    // Verify that the current organization is the owner of the assessment
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

    let can_access = access::can_access_assessment(&app_state, &claims, &assessment_model.org_id, assessment_id).await?;
    if !can_access {
        return Err(ApiError::Forbidden(
            "You are not assigned to this assessment".to_string(),
        ));
    }

    // Verify that the assessment is in draft status (not submitted)
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
            "Cannot delete response for a submitted assessment".to_string(),
        ));
    }

    // Check if the response exists and belongs to the specified assessment
    let existing_response = app_state
        .database
        .assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {e}")))?;

    let existing_response = match existing_response {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if existing_response.assessment_id != assessment_id {
        return Err(ApiError::BadRequest(
            "Response does not belong to the specified assessment".to_string(),
        ));
    }

    // Delete the response from the database
    app_state
        .database
        .assessments_response
        .delete_response(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete response: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}