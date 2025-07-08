use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::common::state::AppState;
use crate::api::error::ApiError;
use crate::api::models::*;

#[derive(Debug, Deserialize)]
pub struct AssessmentQuery {
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
}

pub async fn list_assessments(
    State(app_state): State<AppState>,
    Query(query): Query<AssessmentQuery>,
) -> Result<Json<AssessmentListResponse>, ApiError> {
    // In a real implementation, this would get the user_id from authentication
    // For now, using a hardcoded user_id
    let user_id = "user123";

    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);

    // Fetch assessments from the database for the current user
    let assessment_models = app_state.database.assessments
        .get_assessments_by_user(user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessments: {}", e)))?;

    // Convert database models to API models
    let mut assessments = Vec::new();
    for model in assessment_models {
        assessments.push(Assessment {
            assessment_id: model.assessment_id,
            user_id: model.user_id,
            language: model.language,
            status: "draft".to_string(), // Default status since it's not in the database model yet
            created_at: model.created_at.to_rfc3339(),
            updated_at: model.created_at.to_rfc3339(), // Use created_at as updated_at for now
        });
    }

    // Filter by status if specified
    let filtered_assessments = if let Some(status) = &query.status {
        assessments.into_iter().filter(|a| a.status == *status).collect()
    } else {
        assessments
    };

    let total = filtered_assessments.len() as u32;
    let total_pages = (total as f64 / limit as f64).ceil() as u32;

    // Apply pagination
    let start = ((page - 1) * limit) as usize;
    let end = (start + limit as usize).min(filtered_assessments.len());
    let paginated_assessments = filtered_assessments[start..end].to_vec();

    Ok(Json(AssessmentListResponse {
        assessments: paginated_assessments,
        meta: PaginationMeta {
            page,
            limit,
            total,
            total_pages,
        },
    }))
}

pub async fn create_assessment(
    State(app_state): State<AppState>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // In a real implementation, this would get the user_id from authentication
    // For now, using a hardcoded user_id
    let user_id = "user123".to_string();

    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest("Language must not be empty".to_string()));
    }

    // Create the assessment in the database
    let assessment_model = app_state.database.assessments
        .create_assessment(user_id, request.language)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create assessment: {}", e)))?;

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status: "draft".to_string(), // Default status since it's not in the database model yet
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(), // Use created_at as updated_at for now
    };

    Ok((StatusCode::CREATED, Json(AssessmentResponse { assessment })))
}

pub async fn get_assessment(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<AssessmentWithResponsesResponse>, ApiError> {
    // Fetch the assessment from the database
    let assessment_model = app_state.database.assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {}", e)))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // In a real implementation, you would verify that the current user is the owner
    // For now, we'll skip this check

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status: "draft".to_string(), // Default status since it's not in the database model yet
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(), // Use created_at as updated_at for now
    };

    // Fetch the latest responses for this assessment
    let response_models = app_state.database.assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment responses: {}", e)))?;

    // Convert response models to API models
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

    Ok(Json(AssessmentWithResponsesResponse { assessment, responses }))
}

pub async fn update_assessment(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<UpdateAssessmentRequest>,
) -> Result<Json<AssessmentResponse>, ApiError> {
    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest("Language must not be empty".to_string()));
    }

    // In a real implementation, you would verify that the current user is the owner
    // and that the assessment is in draft status

    // Update the assessment in the database
    let assessment_model = app_state.database.assessments
        .update_assessment(assessment_id, Some(request.language))
        .await
        .map_err(|e| {
            if e.to_string().contains("Assessment not found") {
                ApiError::NotFound("Assessment not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update assessment: {}", e))
            }
        })?;

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        user_id: assessment_model.user_id,
        language: assessment_model.language,
        status: "draft".to_string(), // Default status since it's not in the database model yet
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(), // Use created_at as updated_at for now
    };

    Ok(Json(AssessmentResponse { assessment }))
}

pub async fn delete_assessment(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Check if the assessment exists
    let assessment_exists = app_state.database.assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {}", e)))?;

    if assessment_exists.is_none() {
        return Err(ApiError::NotFound("Assessment not found".to_string()));
    }

    // In a real implementation, you would verify that the current user is the owner
    // and that the assessment is in draft status

    // Delete the assessment from the database (this will cascade delete responses due to foreign key)
    app_state.database.assessments
        .delete_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete assessment: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn submit_assessment(
    State(app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    // In a real implementation, this would get the user_id from authentication
    // For now, using a hardcoded user_id
    let user_id = "user123".to_string();

    // Verify that the assessment exists and belongs to the user
    let assessment_model = app_state.database.assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {}", e)))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // In a real implementation, you would verify that the current user is the owner
    if assessment_model.user_id != user_id {
        return Err(ApiError::BadRequest("You don't have permission to submit this assessment".to_string()));
    }

    // Fetch all responses for this assessment to include in the submission
    let response_models = app_state.database.assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment responses: {}", e)))?;

    // Build the submission content
    let submission_content = serde_json::json!({
        "assessment": {
            "assessment_id": assessment_id,
            "language": assessment_model.language
        },
        "responses": response_models.iter().map(|r| serde_json::json!({
            "question_revision_id": r.question_revision_id,
            "response": r.response,
            "version": r.version
        })).collect::<Vec<_>>()
    });

    // Create the submission record in the database
    let _submission_model = app_state.database.assessments_submission
        .create_submission(assessment_id, user_id.clone(), submission_content.clone())
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create submission: {}", e)))?;

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

    Ok((StatusCode::CREATED, Json(AssessmentSubmissionResponse { submission })))
}
