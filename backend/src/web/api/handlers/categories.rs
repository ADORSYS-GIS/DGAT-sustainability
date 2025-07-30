use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

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

    // Check if the category exists
    let category = app_state
        .database
        .categories
        .get_category_by_id(category_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category: {e}")))?;

    if category.is_none() {
        return Err(ApiError::NotFound("Category not found".to_string()));
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