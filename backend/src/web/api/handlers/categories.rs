use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;
use crate::web::routes::AppState;

#[utoipa::path(
    get,
    path = "/categories",
    responses(
        (status = 200, description = "List categories", body = CategoryListResponse)
    )
)]
pub async fn list_categories(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Result<Json<CategoryListResponse>, ApiError> {
    // Fetch all categories from the database
    let category_models = app_state
        .database
        .categories
        .get_all_categories()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch categories: {e}")))?;

    // Convert database models to API models
    let categories: Vec<Category> = category_models
        .into_iter()
        .map(|model| Category {
            category_id: model.category_id,
            name: model.name,
            weight: model.weight,
            order: model.order,
            template_id: model.template_id,
            created_at: model.created_at.to_rfc3339(),
            updated_at: model.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(CategoryListResponse { categories }))
}

#[utoipa::path(
    post,
    path = "/categories",
    request_body = CreateCategoryRequest,
    responses(
        (status = 201, description = "Create category", body = CategoryResponse)
    )
)]
pub async fn create_category(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateCategoryRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if user has permission to create categories (only drgv_admin)
    if !claims.is_super_user() {
        return Err(ApiError::BadRequest(
            "Only system administrators can create categories".to_string(),
        ));
    }

    // Validate request
    if request.name.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Category name must not be empty".to_string(),
        ));
    }

    if request.weight <= 0 || request.weight > 100 {
        return Err(ApiError::BadRequest(
            "Category weight must be between 1 and 100".to_string(),
        ));
    }

    if request.order <= 0 {
        return Err(ApiError::BadRequest(
            "Category order must be greater than 0".to_string(),
        ));
    }

    // Create the category in the database
    let category_id = Uuid::new_v4();
    let category_model = app_state
        .database
        .categories
        .create_category(
            category_id,
            request.name,
            request.weight,
            request.order,
            request.template_id,
        )
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create category: {e}")))?;

    // Convert database model to API model
    let category = Category {
        category_id: category_model.category_id,
        name: category_model.name,
        weight: category_model.weight,
        order: category_model.order,
        template_id: category_model.template_id,
        created_at: category_model.created_at.to_rfc3339(),
        updated_at: category_model.updated_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(CategoryResponse { category })))
}

#[utoipa::path(
    get,
    path = "/categories/{category_id}",
    responses(
        (status = 200, description = "Get category", body = CategoryResponse)
    ),
    params(
        ("category_id" = Uuid, Path, description = "Category ID")
    )
)]
pub async fn get_category(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(category_id): Path<Uuid>,
) -> Result<Json<CategoryResponse>, ApiError> {
    // Fetch the category from the database
    let category_model = app_state
        .database
        .categories
        .get_category_by_id(category_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category: {e}")))?;

    let category_model = match category_model {
        Some(c) => c,
        None => return Err(ApiError::NotFound("Category not found".to_string())),
    };

    // Convert database model to API model
    let category = Category {
        category_id: category_model.category_id,
        name: category_model.name,
        weight: category_model.weight,
        order: category_model.order,
        template_id: category_model.template_id,
        created_at: category_model.created_at.to_rfc3339(),
        updated_at: category_model.updated_at.to_rfc3339(),
    };

    Ok(Json(CategoryResponse { category }))
}

#[utoipa::path(
    put,
    path = "/categories/{category_id}",
    request_body = UpdateCategoryRequest,
    responses(
        (status = 200, description = "Update category", body = CategoryResponse)
    ),
    params(
        ("category_id" = Uuid, Path, description = "Category ID")
    )
)]
pub async fn update_category(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(category_id): Path<Uuid>,
    Json(request): Json<UpdateCategoryRequest>,
) -> Result<Json<CategoryResponse>, ApiError> {
    // Check if user has permission to update categories (only drgv_admin)
    if !claims.is_super_user() {
        return Err(ApiError::BadRequest(
            "Only system administrators can update categories".to_string(),
        ));
    }

    // Validate request
    if let Some(ref name) = request.name {
        if name.trim().is_empty() {
            return Err(ApiError::BadRequest(
                "Category name must not be empty".to_string(),
            ));
        }
    }

    if let Some(weight) = request.weight {
        if weight <= 0 || weight > 100 {
            return Err(ApiError::BadRequest(
                "Category weight must be between 1 and 100".to_string(),
            ));
        }
    }

    if let Some(order) = request.order {
        if order <= 0 {
            return Err(ApiError::BadRequest(
                "Category order must be greater than 0".to_string(),
            ));
        }
    }

    // Update the category in the database
    let category_model = app_state
        .database
        .categories
        .update_category(category_id, request.name, request.weight, request.order)
        .await
        .map_err(|e| {
            if e.to_string().contains("Category not found") {
                ApiError::NotFound("Category not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update category: {e}"))
            }
        })?;

    // Convert database model to API model
    let category = Category {
        category_id: category_model.category_id,
        name: category_model.name,
        weight: category_model.weight,
        order: category_model.order,
        template_id: category_model.template_id,
        created_at: category_model.created_at.to_rfc3339(),
        updated_at: category_model.updated_at.to_rfc3339(),
    };

    Ok(Json(CategoryResponse { category }))
}

#[utoipa::path(
    delete,
    path = "/categories/{category_id}",
    responses(
        (status = 204, description = "Delete category")
    ),
    params(
        ("category_id" = Uuid, Path, description = "Category ID")
    )
)]
pub async fn delete_category(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(category_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Check if user has permission to delete categories (only drgv_admin)
    if !claims.is_super_user() {
        return Err(ApiError::BadRequest(
            "Only system administrators can delete categories".to_string(),
        ));
    }

    // Check if the category exists and get its name
    let category = app_state
        .database
        .categories
        .get_category_by_id(category_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category: {e}")))?;

    let category = match category {
        Some(c) => c,
        None => return Err(ApiError::NotFound("Category not found".to_string())),
    };

    // Get all questions in this category
    let questions = app_state
        .database
        .questions
        .get_questions_by_category(&category.name)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch questions: {e}")))?;

    // Check if any of these questions have responses in submitted assessments
    let mut has_submitted_responses = false;
    for question in &questions {
        let question_revisions = app_state
            .database
            .questions_revisions
            .get_revisions_by_question(question.question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch question revisions: {e}"))
            })?;

        for revision in question_revisions {
            let has_responses = app_state
                .database
                .assessments_response
                .has_responses_for_question_revision(revision.question_revision_id)
                .await
                .map_err(|e| {
                    ApiError::InternalServerError(format!("Failed to check responses: {e}"))
                })?;

            if has_responses {
                has_submitted_responses = true;
                break;
            }
        }
        if has_submitted_responses {
            break;
        }
    }

    // If there are submitted responses, we should warn but still allow deletion
    // because the submission data is preserved in the submissions table
    if has_submitted_responses {
        // Log a warning but continue with deletion
        println!("Warning: Category '{}' has questions with submitted responses. The responses will be preserved in submissions but individual response records will be deleted.", category.name);
    }

    // Delete all questions in this category
    for question in questions {
        // Get all question revisions for this question
        let question_revisions = app_state
            .database
            .questions_revisions
            .get_revisions_by_question(question.question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch question revisions: {e}"))
            })?;

        // Delete assessment responses that reference these question revisions
        for revision in question_revisions {
            app_state
                .database
                .assessments_response
                .delete_responses_by_question_revision_id(revision.question_revision_id)
                .await
                .map_err(|e| {
                    ApiError::InternalServerError(format!(
                        "Failed to delete assessment responses: {e}"
                    ))
                })?;
        }

        // Delete question revisions first (due to foreign key constraint)
        app_state
            .database
            .questions_revisions
            .delete_revisions_by_question_id(question.question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to delete question revisions: {e}"))
            })?;

        // Delete the question
        app_state
            .database
            .questions
            .delete_question(question.question_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to delete question: {e}"))
            })?;
    }

    // Delete the category from the database
    app_state
        .database
        .categories
        .delete_category(category_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete category: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}
