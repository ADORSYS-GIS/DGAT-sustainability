use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use uuid::Uuid;

use crate::web::api::error::ApiError;
use crate::web::api::models::*;
use crate::web::routes::AppState;

#[derive(Debug, Deserialize)]
pub struct QuestionRevisionQuery {
    question_revision_id: Option<Uuid>,
}

pub async fn list_questions(
    State(app_state): State<AppState>,
) -> Result<Json<QuestionListResponse>, ApiError> {
    // Fetch all questions from the database
    let db_questions = app_state
        .database
        .questions
        .get_all_questions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch questions: {e}")))?;

    // Convert database models to API models with their latest revisions
    let mut questions = Vec::new();
    for db_question in db_questions {
        // Fetch the latest revision for this question
        let revision_model = app_state
            .database
            .questions_revisions
            .get_latest_revision_by_question(db_question.question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch question revision: {e}"))
            })?;

        if let Some(revision_model) = revision_model {
            // Convert the JSON text to HashMap<String, String>
            let text_map = if let Some(text_obj) = revision_model.text.as_object() {
                text_obj
                    .iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            } else {
                HashMap::new()
            };

            let question = Question {
                question_id: db_question.question_id,
                category: db_question.category,
                created_at: db_question.created_at.to_rfc3339(),
                latest_revision: QuestionRevision {
                    question_revision_id: revision_model.question_revision_id,
                    question_id: revision_model.question_id,
                    text: text_map,
                    weight: revision_model.weight as f64,
                    created_at: revision_model.created_at.to_rfc3339(),
                },
            };

            questions.push(question);
        }
    }

    Ok(Json(QuestionListResponse { questions }))
}

pub async fn create_question(
    State(app_state): State<AppState>,
    Json(request): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request
    if request.text.is_empty() {
        return Err(ApiError::BadRequest("Text must not be empty".to_string()));
    }

    if request.weight <= 0.0 {
        return Err(ApiError::BadRequest(
            "Weight must be greater than 0".to_string(),
        ));
    }

    // Create the question in the database
    let question_model = app_state
        .database
        .questions
        .create_question(request.category.clone())
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create question: {e}")))?;

    // Create the initial revision with the multilingual text and weight
    let text_json = serde_json::to_value(&request.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to serialize text: {e}")))?;
    let revision_model = app_state
        .database
        .questions_revisions
        .create_question_revision(question_model.question_id, text_json, request.weight as f32)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to create question revision: {e}"))
        })?;

    // Build the response with the created question and revision
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at.to_rfc3339(),
        latest_revision: QuestionRevision {
            question_revision_id: revision_model.question_revision_id,
            question_id: revision_model.question_id,
            text: request.text,
            weight: revision_model.weight as f64,
            created_at: revision_model.created_at.to_rfc3339(),
        },
    };

    Ok((StatusCode::CREATED, Json(QuestionResponse { question })))
}

pub async fn get_question(
    State(app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
    Query(query): Query<QuestionRevisionQuery>,
) -> Result<Json<QuestionResponse>, ApiError> {
    // Fetch the question from the database
    let question_model = app_state
        .database
        .questions
        .get_question_by_id(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {e}")))?;

    let question_model = match question_model {
        Some(q) => q,
        None => return Err(ApiError::NotFound("Question not found".to_string())),
    };

    // Fetch the revision for this question (specific revision if provided, otherwise latest)
    let revision = if let Some(revision_id) = query.question_revision_id {
        // Fetch specific revision by ID
        let revision = app_state
            .database
            .questions_revisions
            .get_revision_by_id(revision_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch question revision: {e}"))
            })?;

        // Verify that the revision belongs to the requested question
        match revision {
            Some(r) if r.question_id == question_id => Some(r),
            Some(_) => {
                return Err(ApiError::BadRequest(
                    "Revision does not belong to the specified question".to_string(),
                ))
            }
            None => {
                return Err(ApiError::NotFound(
                    "Question revision not found".to_string(),
                ))
            }
        }
    } else {
        // Fetch latest revision for this question
        app_state
            .database
            .questions_revisions
            .get_latest_revision_by_question(question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch question revision: {e}"))
            })?
    };

    let revision = match revision {
        Some(r) => r,
        None => {
            return Err(ApiError::InternalServerError(
                "Question has no revisions".to_string(),
            ))
        }
    };

    // Convert the database text (JSON Value) to HashMap<String, String>
    let text_map: HashMap<String, String> = serde_json::from_value(revision.text).map_err(|e| {
        ApiError::InternalServerError(format!("Failed to parse question text: {e}"))
    })?;

    // Build the response
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at.to_rfc3339(),
        latest_revision: QuestionRevision {
            question_revision_id: revision.question_revision_id,
            question_id: revision.question_id,
            text: text_map,
            weight: revision.weight as f64,
            created_at: revision.created_at.to_rfc3339(),
        },
    };

    Ok(Json(QuestionResponse { question }))
}

pub async fn update_question(
    State(app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
    Json(request): Json<UpdateQuestionRequest>,
) -> Result<Json<QuestionResponse>, ApiError> {
    // Validate request
    if request.text.is_empty() {
        return Err(ApiError::BadRequest("Text must not be empty".to_string()));
    }

    if request.weight <= 0.0 {
        return Err(ApiError::BadRequest(
            "Weight must be greater than 0".to_string(),
        ));
    }

    // Update the question category in the database
    let updated_question_model = app_state
        .database
        .questions
        .update_question(question_id, Some(request.category.clone()))
        .await
        .map_err(|e| {
            if e.to_string().contains("Question not found") {
                ApiError::NotFound("Question not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update question: {e}"))
            }
        })?;

    // Create a new revision for the question update
    let text_json = serde_json::to_value(&request.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to serialize text: {e}")))?;
    let revision_model = app_state
        .database
        .questions_revisions
        .create_question_revision(question_id, text_json, request.weight as f32)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to create question revision: {e}"))
        })?;

    // Build the response
    let question = Question {
        question_id: updated_question_model.question_id,
        category: updated_question_model.category,
        created_at: updated_question_model.created_at.to_rfc3339(),
        latest_revision: QuestionRevision {
            question_revision_id: revision_model.question_revision_id,
            question_id: revision_model.question_id,
            text: request.text,
            weight: revision_model.weight as f64,
            created_at: revision_model.created_at.to_rfc3339(),
        },
    };

    Ok(Json(QuestionResponse { question }))
}

pub async fn delete_question_revision_by_id(
    State(app_state): State<AppState>,
    Path(revision_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Check if the question revision exists
    let revision_exists = app_state
        .database
        .questions_revisions
        .get_revision_by_id(revision_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch question revision: {e}"))
        })?;

    if revision_exists.is_none() {
        return Err(ApiError::NotFound(
            "Question revision not found".to_string(),
        ));
    }

    // Check if any assessment responses reference this question revision
    let has_responses = app_state
        .database
        .assessments_response
        .has_responses_for_question_revision(revision_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check assessment responses: {e}"))
        })?;

    if has_responses {
        return Err(ApiError::BadRequest(
            "Cannot delete question revision: It is currently being used in assessment responses. Please ensure no active assessments reference this revision before deletion.".to_string()
        ));
    }

    // Delete the question revision from the database
    app_state
        .database
        .questions_revisions
        .delete_revision(revision_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to delete question revision: {e}"))
        })?;

    Ok(StatusCode::NO_CONTENT)
}
