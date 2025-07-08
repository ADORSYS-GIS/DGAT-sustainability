use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use uuid::Uuid;

use crate::common::state::AppState;
use crate::api::error::ApiError;
use crate::api::models::*;

#[derive(Debug, Deserialize)]
pub struct QuestionQuery {
    category: Option<String>,
    language: Option<String>,
}

pub async fn list_questions(
    State(app_state): State<AppState>,
    Query(query): Query<QuestionQuery>,
) -> Result<Json<QuestionListResponse>, ApiError> {

    // Fetch questions from the database
    let db_questions = if let Some(category) = &query.category {
        app_state.database.questions.get_questions_by_category(category).await.unwrap_or_else(|_| Vec::new())
    } else {
        app_state.database.questions.get_all_questions().await.unwrap_or_else(|_| Vec::new())
    };

    // Convert database models to API models with the latest revisions
    let mut questions = Vec::new();
    for db_question in db_questions {
        // Get the latest revision for this question
        if let Ok(Some(latest_revision_model)) = app_state.database.questions_revisions
            .get_latest_revision_by_question(db_question.question_id).await {

            // Convert the JSON text to HashMap<String, String>
            let text_map = if let Some(text_obj) = latest_revision_model.text.as_object() {
                text_obj.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            } else {
                HashMap::new()
            };

            let mut question = Question {
                question_id: db_question.question_id,
                category: db_question.category,
                created_at: db_question.created_at,
                latest_revision: QuestionRevision {
                    question_revision_id: latest_revision_model.question_revision_id,
                    question_id: latest_revision_model.question_id,
                    text: text_map.clone(),
                    weight: latest_revision_model.weight as f64,
                    created_at: latest_revision_model.created_at,
                },
            };

            // Filter by language if specified
            if let Some(language) = &query.language {
                if text_map.contains_key(language) {
                    let mut filtered_text = HashMap::new();
                    filtered_text.insert(language.clone(), text_map.get(language).unwrap_or(&String::new()).clone());
                    question.latest_revision.text = filtered_text;
                    questions.push(question);
                }
            } else {
                questions.push(question);
            }
        }
    }

    Ok(Json(QuestionListResponse {
        questions,
    }))
}

pub async fn create_question(
    State(app_state): State<AppState>,
    Json(request): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request
    if request.text.is_empty() {
        return Err(ApiError::BadRequest("Text must not be empty".to_string()));
    }

    if request.weight < 0.0 || request.weight > 1.0 {
        return Err(ApiError::BadRequest("Weight must be between 0 and 1".to_string()));
    }

    // Create the question in the database
    let question_model = app_state.database.questions
        .create_question(request.category.clone())
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create question: {}", e)))?;

    // Create the initial revision with the multilingual text and weight
    let text_json = serde_json::to_value(&request.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to serialize text: {}", e)))?;
    let revision_model = app_state.database.questions_revisions
        .create_question_revision(question_model.question_id, text_json, request.weight as f32)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create question revision: {}", e)))?;

    // Build the response
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at,
        latest_revision: QuestionRevision {
            question_revision_id: revision_model.question_revision_id,
            question_id: revision_model.question_id,
            text: request.text,
            weight: revision_model.weight as f64,
            created_at: revision_model.created_at,
        },
    };

    Ok((StatusCode::CREATED, Json(QuestionResponse { question })))
}

pub async fn create_question_with_translation(
    State(app_state): State<AppState>,
    Json(request): Json<CreateQuestionWithTranslationRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Validate request
    if request.source_text.trim().is_empty() {
        return Err(ApiError::BadRequest("Source text must not be empty".to_string()));
    }

    if request.source_language.trim().is_empty() {
        return Err(ApiError::BadRequest("Source language must not be empty".to_string()));
    }

    if request.target_languages.is_empty() {
        return Err(ApiError::BadRequest("Target languages must not be empty".to_string()));
    }

    if request.weight < 0.0 || request.weight > 1.0 {
        return Err(ApiError::BadRequest("Weight must be between 0 and 1".to_string()));
    }

    // Validate language codes (basic validation)
    let supported_languages = vec!["en", "fr", "es", "de"];
    if !supported_languages.contains(&request.source_language.as_str()) {
        return Err(ApiError::BadRequest(format!("Unsupported source language: {}", request.source_language)));
    }

    for target_lang in &request.target_languages {
        if !supported_languages.contains(&target_lang.as_str()) {
            return Err(ApiError::BadRequest(format!("Unsupported target language: {}", target_lang)));
        }
    }

    // Generate multilingual text using translation service
    let multilingual_text = match app_state.translation
        .translate_to_multiple(&request.source_text, &request.source_language, &request.target_languages)
        .await
    {
        Ok(translations) => translations,
        Err(e) => {
            return Err(ApiError::InternalServerError(format!("Translation failed: {:?}", e)));
        }
    };

    // Create the question with the generated multilingual text
    let question_id = Uuid::new_v4();
    let revision_id = Uuid::new_v4();
    let now = chrono::Utc::now().to_rfc3339();

    let question = Question {
        question_id,
        category: request.category,
        created_at: now.clone(),
        latest_revision: QuestionRevision {
            question_revision_id: revision_id,
            question_id,
            text: multilingual_text,
            weight: request.weight,
            created_at: now,
        },
    };

    Ok((StatusCode::CREATED, Json(QuestionResponse { question })))
}

pub async fn get_question(
    State(app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
) -> Result<Json<QuestionResponse>, ApiError> {
    // Fetch the question from the database
    let question_model = app_state.database.questions
        .get_question_by_id(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {}", e)))?;

    let question_model = match question_model {
        Some(q) => q,
        None => return Err(ApiError::NotFound("Question not found".to_string())),
    };

    // Fetch the latest revision for this question
    let latest_revision = app_state.database.questions_revisions
        .get_latest_revision_by_question(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revision: {}", e)))?;

    let latest_revision = match latest_revision {
        Some(r) => r,
        None => return Err(ApiError::InternalServerError("Question has no revisions".to_string())),
    };

    // Convert the database text (JSON Value) to HashMap<String, String>
    let text_map: HashMap<String, String> = serde_json::from_value(latest_revision.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to parse question text: {}", e)))?;

    // Build the response
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at,
        latest_revision: QuestionRevision {
            question_revision_id: latest_revision.question_revision_id,
            question_id: latest_revision.question_id,
            text: text_map,
            weight: latest_revision.weight as f64,
            created_at: latest_revision.created_at,
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

    if request.weight < 0.0 || request.weight > 1.0 {
        return Err(ApiError::BadRequest("Weight must be between 0 and 1".to_string()));
    }

    // Fetch the existing question to ensure it exists
    let question_model = app_state.database.questions
        .get_question_by_id(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {}", e)))?;

    let question_model = match question_model {
        Some(q) => q,
        None => return Err(ApiError::NotFound("Question not found".to_string())),
    };

    // Create a new revision for the question update
    let text_json = serde_json::to_value(&request.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to serialize text: {}", e)))?;
    let revision_model = app_state.database.questions_revisions
        .create_question_revision(question_id, text_json, request.weight as f32)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create question revision: {}", e)))?;

    // Build the response
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at,
        latest_revision: QuestionRevision {
            question_revision_id: revision_model.question_revision_id,
            question_id: revision_model.question_id,
            text: request.text,
            weight: revision_model.weight as f64,
            created_at: revision_model.created_at,
        },
    };

    Ok(Json(QuestionResponse { question }))
}

pub async fn delete_question(
    State(app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {

    // Check if the question exists
    let question_exists = app_state.database.questions
        .get_question_by_id(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {}", e)))?;

    if question_exists.is_none() {
        return Err(ApiError::NotFound("Question not found".to_string()));
    }

    // Delete the question from the database (this will cascade delete revisions due to foreign key)
    app_state.database.questions
        .delete_question(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete question: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_question_revisions(
    State(app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
) -> Result<Json<QuestionWithRevisionsResponse>, ApiError> {

    // Fetch the question from the database
    let question_model = app_state.database.questions
        .get_question_by_id(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {}", e)))?;

    let question_model = match question_model {
        Some(q) => q,
        None => return Err(ApiError::NotFound("Question not found".to_string())),
    };

    // Fetch all revisions for this question from the database
    let revision_models = app_state.database.questions_revisions
        .get_revisions_by_question(question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revisions: {}", e)))?;

    if revision_models.is_empty() {
        return Err(ApiError::InternalServerError("Question has no revisions".to_string()));
    }

    // Convert database models to API models
    let mut revisions = Vec::new();
    for revision_model in &revision_models {
        let text_map: HashMap<String, String> = serde_json::from_value(revision_model.text.clone())
            .map_err(|e| ApiError::InternalServerError(format!("Failed to parse question text: {}", e)))?;

        revisions.push(QuestionRevision {
            question_revision_id: revision_model.question_revision_id,
            question_id: revision_model.question_id,
            text: text_map,
            weight: revision_model.weight as f64,
            created_at: revision_model.created_at.clone(),
        });
    }

    // Sort revisions by created_at descending (newest first)
    revisions.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Build the question with the latest revision
    let latest_revision = revisions[0].clone();
    let question = Question {
        question_id: question_model.question_id,
        category: question_model.category,
        created_at: question_model.created_at,
        latest_revision,
    };

    Ok(Json(QuestionWithRevisionsResponse { question, revisions }))
}

pub async fn get_question_revision(
    State(app_state): State<AppState>,
    Path(revision_id): Path<Uuid>,
) -> Result<Json<QuestionRevisionResponse>, ApiError> {

    // Fetch the specific revision from the database
    let revision_model = app_state.database.questions_revisions
        .get_revision_by_id(revision_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revision: {}", e)))?;

    let revision_model = match revision_model {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Question revision not found".to_string())),
    };

    // Convert the database text (JSON Value) to HashMap<String, String>
    let text_map: HashMap<String, String> = serde_json::from_value(revision_model.text)
        .map_err(|e| ApiError::InternalServerError(format!("Failed to parse question text: {}", e)))?;

    // Build the response
    let revision = QuestionRevision {
        question_revision_id: revision_model.question_revision_id,
        question_id: revision_model.question_id,
        text: text_map,
        weight: revision_model.weight as f64,
        created_at: revision_model.created_at,
    };

    Ok(Json(QuestionRevisionResponse { revision }))
}
