use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::common::state::AppState;
use crate::api::error::ApiError;
use crate::api::models::*;

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

pub async fn list_responses(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<ResponseListResponse>, ApiError> {
    // In a real implementation, you would verify that the current user is the owner
    // For now, we'll skip this check

    // Fetch the latest responses for the specified assessment from the database
    let response_models = app_state.database.assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch responses: {}", e)))?;

    // Convert database models to API models
    let mut responses = Vec::new();
    for response_model in response_models {
        responses.push(Response {
            response_id: response_model.response_id,
            assessment_id: response_model.assessment_id,
            question_revision_id: response_model.question_revision_id,
            response: response_model.response,
            version: response_model.version,
            updated_at: response_model.updated_at.to_rfc3339(),
            files: vec![], // Files would be fetched separately if needed
        });
    }

    Ok(Json(ResponseListResponse { responses }))
}

pub async fn create_response(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<CreateResponseRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request
    if request.response.trim().is_empty() {
        return Err(ApiError::BadRequest("Response must not be empty".to_string()));
    }

    // In a real implementation, you would:
    // 1. Verify that the current user is the owner of the assessment
    // 2. Verify that the assessment is in draft status
    // For now, we'll skip these checks

    // Create the response in the database
    let response_model = app_state.database.assessments_response
        .create_response(assessment_id, request.question_revision_id, request.response, 1)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create response: {}", e)))?;

    // Convert database model to API model
    let response = Response {
        response_id: response_model.response_id,
        assessment_id: response_model.assessment_id,
        question_revision_id: response_model.question_revision_id,
        response: response_model.response,
        version: response_model.version,
        updated_at: response_model.updated_at.to_rfc3339(),
        files: vec![], // Files would be fetched separately if needed
    };

    Ok((StatusCode::CREATED, Json(ResponseResponse { response })))
}

pub async fn get_response(
    State(app_state): State<AppState>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ResponseResponse>, ApiError> {
    // In a real implementation, you would verify that the current user is the owner of the assessment
    // For now, we'll skip this check

    // Fetch the response from the database
    let response_model = app_state.database.assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {}", e)))?;

    let response_model = match response_model {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if response_model.assessment_id != assessment_id {
        return Err(ApiError::BadRequest("Response does not belong to the specified assessment".to_string()));
    }

    // Convert database model to API model
    let response = Response {
        response_id: response_model.response_id,
        assessment_id: response_model.assessment_id,
        question_revision_id: response_model.question_revision_id,
        response: response_model.response,
        version: response_model.version,
        updated_at: response_model.updated_at.to_rfc3339(),
        files: vec![], // Files would be fetched separately if needed
    };

    Ok(Json(ResponseResponse { response }))
}

pub async fn update_response(
    State(app_state): State<AppState>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
    Json(request): Json<UpdateResponseRequest>,
) -> Result<Json<ResponseResponse>, ApiError> {
    // Validate request
    if request.response.trim().is_empty() {
        return Err(ApiError::BadRequest("Response must not be empty".to_string()));
    }

    // In a real implementation, you would:
    // 1. Verify that the current user is the owner of the assessment
    // 2. Verify that the assessment is in draft status
    // 3. Check for version conflicts
    // For now, we'll skip these checks

    // Fetch the existing response to get the question_revision_id
    let existing_response = app_state.database.assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {}", e)))?;

    let existing_response = match existing_response {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if existing_response.assessment_id != assessment_id {
        return Err(ApiError::BadRequest("Response does not belong to the specified assessment".to_string()));
    }

    // Check for version conflicts
    if existing_response.version != request.version {
        return Err(ApiError::Conflict("Version conflict: response has been modified by another user".to_string()));
    }

    // Update the response in the database
    let updated_response = app_state.database.assessments_response
        .update_response(assessment_id, existing_response.question_revision_id, request.response)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to update response: {}", e)))?;

    // Convert database model to API model
    let response = Response {
        response_id: updated_response.response_id,
        assessment_id: updated_response.assessment_id,
        question_revision_id: updated_response.question_revision_id,
        response: updated_response.response,
        version: updated_response.version,
        updated_at: updated_response.updated_at.to_rfc3339(),
        files: vec![], // Files would be fetched separately if needed
    };

    Ok(Json(ResponseResponse { response }))
}

pub async fn delete_response(
    State(app_state): State<AppState>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    // In a real implementation, you would:
    // 1. Verify that the current user is the owner of the assessment
    // 2. Verify that the assessment is in draft status
    // For now, we'll skip these checks

    // Check if the response exists and belongs to the specified assessment
    let existing_response = app_state.database.assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {}", e)))?;

    let existing_response = match existing_response {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if existing_response.assessment_id != assessment_id {
        return Err(ApiError::BadRequest("Response does not belong to the specified assessment".to_string()));
    }

    // Delete the response from the database
    app_state.database.assessments_response
        .delete_response(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete response: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_response_history(
    State(app_state): State<AppState>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ResponseHistoryResponse>, ApiError> {
    // In a real implementation, you would verify that the current user is the owner of the assessment
    // For now, we'll skip this check

    // First, get the current response to find the question_revision_id
    let current_response = app_state.database.assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {}", e)))?;

    let current_response = match current_response {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    // Verify that the response belongs to the specified assessment
    if current_response.assessment_id != assessment_id {
        return Err(ApiError::BadRequest("Response does not belong to the specified assessment".to_string()));
    }

    // Fetch all responses for this assessment
    let all_responses = app_state.database.assessments_response
        .get_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response history: {}", e)))?;

    // Filter responses for the same question_revision_id and sort by version descending
    let mut question_responses: Vec<_> = all_responses
        .into_iter()
        .filter(|r| r.question_revision_id == current_response.question_revision_id)
        .collect();

    question_responses.sort_by(|a, b| b.version.cmp(&a.version));

    // Convert to ResponseVersion format
    let history: Vec<ResponseVersion> = question_responses
        .into_iter()
        .map(|r| ResponseVersion {
            version: r.version,
            response: r.response,
            updated_at: r.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(ResponseHistoryResponse { response_id, history }))
}
