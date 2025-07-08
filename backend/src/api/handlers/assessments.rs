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
    State(_app_state): State<AppState>,
    Query(query): Query<AssessmentQuery>,
) -> Result<Json<AssessmentListResponse>, ApiError> {
    // In a real implementation, you would fetch assessments from the database
    // for the current user based on the query parameters

    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);

    // Simulated assessments
    let assessments = vec![
        Assessment {
            assessment_id: Uuid::new_v4(),
            user_id: "user123".to_string(),
            language: "en".to_string(),
            status: "draft".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        },
        Assessment {
            assessment_id: Uuid::new_v4(),
            user_id: "user123".to_string(),
            language: "fr".to_string(),
            status: "submitted".to_string(),
            created_at: "2023-01-01T00:00:00Z".to_string(),
            updated_at: "2023-01-02T00:00:00Z".to_string(),
        },
    ];

    // Filter by status if specified
    let filtered_assessments = if let Some(status) = &query.status {
        assessments.into_iter().filter(|a| a.status == *status).collect()
    } else {
        assessments
    };

    let total = filtered_assessments.len() as u32;
    let total_pages = (total as f64 / limit as f64).ceil() as u32;

    Ok(Json(AssessmentListResponse {
        assessments: filtered_assessments,
        meta: PaginationMeta {
            page,
            limit,
            total,
            total_pages,
        },
    }))
}

pub async fn create_assessment(
    State(_app_state): State<AppState>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // In a real implementation, you would create the assessment in the database
    // and associate it with the current user

    // Simulated assessment creation
    let assessment_id = Uuid::new_v4();
    let now = chrono::Utc::now().to_rfc3339();

    let assessment = Assessment {
        assessment_id,
        user_id: "user123".to_string(), // This would be the authenticated user ID
        language: request.language,
        status: "draft".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    Ok((StatusCode::CREATED, Json(AssessmentResponse { assessment })))
}

pub async fn get_assessment(
    State(_app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<AssessmentWithResponsesResponse>, ApiError> {
    // In a real implementation, you would fetch the assessment and its responses from the database
    // and verify that the current user is the owner

    // Simulated assessment
    let now = chrono::Utc::now().to_rfc3339();

    let assessment = Assessment {
        assessment_id,
        user_id: "user123".to_string(),
        language: "en".to_string(),
        status: "draft".to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    // Simulated responses
    let responses = vec![
        Response {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id: Uuid::new_v4(),
            response: "This is a sample response".to_string(),
            version: 1,
            updated_at: now.clone(),
            files: vec![],
        },
        Response {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id: Uuid::new_v4(),
            response: "This is another sample response".to_string(),
            version: 2,
            updated_at: now,
            files: vec![],
        },
    ];

    Ok(Json(AssessmentWithResponsesResponse { assessment, responses }))
}

pub async fn update_assessment(
    State(_app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<UpdateAssessmentRequest>,
) -> Result<Json<AssessmentResponse>, ApiError> {
    // In a real implementation, you would update the assessment in the database
    // after verifying that the current user is the owner and that it's in draft status

    // Simulated assessment update
    let now = chrono::Utc::now().to_rfc3339();

    let assessment = Assessment {
        assessment_id,
        user_id: "user123".to_string(),
        language: request.language,
        status: "draft".to_string(),
        created_at: "2023-01-01T00:00:00Z".to_string(),
        updated_at: now,
    };

    Ok(Json(AssessmentResponse { assessment }))
}

pub async fn delete_assessment(
    State(_app_state): State<AppState>,
    Path(_assessment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // In a real implementation, you would delete the assessment from the database
    // after verifying that the current user is the owner and that it's in draft status

    // Simulated deletion (always succeeds)
    Ok(StatusCode::NO_CONTENT)
}

pub async fn submit_assessment(
    State(_app_state): State<AppState>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    // In a real implementation, you would:
    // 1. Verify that the current user is the owner
    // 2. Verify that the assessment is in draft status
    // 3. Create an immutable submission with all responses
    // 4. Update the assessment status to "submitted"

    // Simulated submission
    let now = chrono::Utc::now().to_rfc3339();

    let submission = AssessmentSubmission {
        assessment_id,
        user_id: "user123".to_string(),
        content: serde_json::json!({
            "responses": [
                {
                    "question_revision_id": "550e8400-e29b-41d4-a716-446655440000",
                    "response": "This is a sample response",
                    "version": 1
                }
            ]
        }),
        submitted_at: now,
    };

    Ok((StatusCode::CREATED, Json(AssessmentSubmissionResponse { submission })))
}