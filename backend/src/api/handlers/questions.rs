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
use crate::api::handlers::health::increment_request_count;

#[derive(Debug, Deserialize)]
pub struct QuestionQuery {
    page: Option<u32>,
    limit: Option<u32>,
    category: Option<String>,
    language: Option<String>,
}

pub async fn list_questions(
    State(app_state): State<AppState>,
    Query(query): Query<QuestionQuery>,
) -> Result<Json<QuestionListResponse>, ApiError> {
    increment_request_count();

    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20).min(100);

    // Fetch questions from the database
    let db_questions = if let Some(category) = &query.category {
        match app_state.database.questions.get_questions_by_category(category).await {
            Ok(questions) => questions,
            Err(_) => Vec::new(), // Return empty list if database error (e.g., table doesn't exist)
        }
    } else {
        match app_state.database.questions.get_all_questions().await {
            Ok(questions) => questions,
            Err(_) => Vec::new(), // Return empty list if database error (e.g., table doesn't exist)
        }
    };

    // Convert database models to API models with latest revisions
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

            let question = Question {
                question_id: db_question.question_id,
                category: db_question.category,
                created_at: chrono::Utc::now().to_rfc3339(), // In real implementation, this would come from the database
                latest_revision: QuestionRevision {
                    question_revision_id: latest_revision_model.question_revision_id,
                    question_id: latest_revision_model.question_id,
                    text: text_map,
                    weight: latest_revision_model.weight as f64,
                    created_at: latest_revision_model.created_at,
                },
            };
            questions.push(question);
        }
    }

    // Apply pagination
    let total = questions.len() as u32;
    let total_pages = (total as f64 / limit as f64).ceil() as u32;

    let start_index = ((page - 1) * limit) as usize;
    let end_index = (start_index + limit as usize).min(questions.len());
    let paginated_questions = if start_index < questions.len() {
        questions[start_index..end_index].to_vec()
    } else {
        Vec::new()
    };

    Ok(Json(QuestionListResponse {
        questions: paginated_questions,
        meta: PaginationMeta {
            page,
            limit,
            total,
            total_pages,
        },
    }))
}

pub async fn create_question(
    State(_app_state): State<AppState>,
    Json(request): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    increment_request_count();

    // Validate request
    if request.text.is_empty() {
        return Err(ApiError::BadRequest("Text must not be empty".to_string()));
    }

    if request.weight < 0.0 || request.weight > 1.0 {
        return Err(ApiError::BadRequest("Weight must be between 0 and 1".to_string()));
    }

    // In a real implementation, you would create the question in the database
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
            text: request.text,
            weight: request.weight,
            created_at: now,
        },
    };

    Ok((StatusCode::CREATED, Json(QuestionResponse { question })))
}

pub async fn get_question(
    State(_app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
) -> Result<Json<QuestionResponse>, ApiError> {
    increment_request_count();

    // In a real implementation, you would fetch the question from the database

    // Simulated question
    let now = chrono::Utc::now().to_rfc3339();
    let question = Question {
        question_id,
        category: "sustainability".to_string(),
        created_at: now.clone(),
        latest_revision: QuestionRevision {
            question_revision_id: Uuid::new_v4(),
            question_id,
            text: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "What is your organization's sustainability policy?".to_string());
                map.insert("fr".to_string(), "Quelle est la politique de durabilité de votre organisation?".to_string());
                map
            },
            weight: 0.5,
            created_at: now,
        },
    };

    Ok(Json(QuestionResponse { question }))
}

pub async fn update_question(
    State(_app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
    Json(request): Json<UpdateQuestionRequest>,
) -> Result<Json<QuestionResponse>, ApiError> {
    increment_request_count();

    // Validate request
    if request.text.is_empty() {
        return Err(ApiError::BadRequest("Text must not be empty".to_string()));
    }

    if request.weight < 0.0 || request.weight > 1.0 {
        return Err(ApiError::BadRequest("Weight must be between 0 and 1".to_string()));
    }

    // In a real implementation, you would update the question in the database
    // by creating a new revision

    let revision_id = Uuid::new_v4();
    let now = chrono::Utc::now().to_rfc3339();

    let question = Question {
        question_id,
        category: "sustainability".to_string(), // This would come from the existing question
        created_at: "2023-01-01T00:00:00Z".to_string(), // This would come from the existing question
        latest_revision: QuestionRevision {
            question_revision_id: revision_id,
            question_id,
            text: request.text,
            weight: request.weight,
            created_at: now,
        },
    };

    Ok(Json(QuestionResponse { question }))
}

pub async fn delete_question(
    State(_app_state): State<AppState>,
    Path(_question_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    increment_request_count();

    // In a real implementation, you would delete the question from the database
    // This might involve soft deletion or checking for dependencies

    // Simulated deletion (always succeeds)
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_question_revisions(
    State(_app_state): State<AppState>,
    Path(question_id): Path<Uuid>,
) -> Result<Json<QuestionWithRevisionsResponse>, ApiError> {
    increment_request_count();

    // In a real implementation, you would fetch all revisions for the question from the database

    let now = chrono::Utc::now().to_rfc3339();

    let revisions = vec![
        QuestionRevision {
            question_revision_id: Uuid::new_v4(),
            question_id,
            text: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "What is your organization's sustainability policy? (Updated)".to_string());
                map.insert("fr".to_string(), "Quelle est la politique de durabilité de votre organisation? (Mis à jour)".to_string());
                map
            },
            weight: 0.6,
            created_at: now.clone(),
        },
        QuestionRevision {
            question_revision_id: Uuid::new_v4(),
            question_id,
            text: {
                let mut map = HashMap::new();
                map.insert("en".to_string(), "What is your organization's sustainability policy?".to_string());
                map.insert("fr".to_string(), "Quelle est la politique de durabilité de votre organisation?".to_string());
                map
            },
            weight: 0.5,
            created_at: "2023-01-01T00:00:00Z".to_string(),
        },
    ];

    let question = Question {
        question_id,
        category: "sustainability".to_string(),
        created_at: "2023-01-01T00:00:00Z".to_string(),
        latest_revision: revisions[0].clone(),
    };

    Ok(Json(QuestionWithRevisionsResponse { question, revisions }))
}

pub async fn get_question_revision(
    State(_app_state): State<AppState>,
    Path(revision_id): Path<Uuid>,
) -> Result<Json<QuestionRevisionResponse>, ApiError> {
    increment_request_count();

    // In a real implementation, you would fetch the specific revision from the database

    let revision = QuestionRevision {
        question_revision_id: revision_id,
        question_id: Uuid::new_v4(),
        text: {
            let mut map = HashMap::new();
            map.insert("en".to_string(), "What is your organization's sustainability policy?".to_string());
            map.insert("fr".to_string(), "Quelle est la politique de durabilité de votre organisation?".to_string());
            map
        },
        weight: 0.5,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(Json(QuestionRevisionResponse { revision }))
}
