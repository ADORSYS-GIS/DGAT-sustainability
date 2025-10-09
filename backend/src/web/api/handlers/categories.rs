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

/// List all categories
#[utoipa::path(
    get,
    path = "/categories",
    tag = "Category",
    responses(
        (status = 200, description = "List of categories", body = CategoryListResponse),
        (status = 500, description = "Server error")
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

/// Create a new category
#[utoipa::path(
    post,
    path = "/categories",
    tag = "Category",
    request_body = CreateCategoryRequest,
    responses(
        (status = 201, description = "Category created", body = CategoryResponse),
        (status = 400, description = "Validation or permission error"),
        (status = 500, description = "Server error")
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

/// Get a category by ID
#[utoipa::path(
    get,
    path = "/categories/{category_id}",
    tag = "Category",
    params(
        ("category_id" = uuid::Uuid, Path, description = "Category ID")
    ),
    responses(
        (status = 200, description = "Category found", body = CategoryResponse),
        (status = 404, description = "Category not found"),
        (status = 500, description = "Server error")
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

/// Update a category
#[utoipa::path(
    put,
    path = "/categories/{category_id}",
    tag = "Category",
    params(
        ("category_id" = uuid::Uuid, Path, description = "Category ID")
    ),
    request_body = UpdateCategoryRequest,
    responses(
        (status = 200, description = "Category updated", body = CategoryResponse),
        (status = 400, description = "Validation or permission error"),
        (status = 404, description = "Category not found"),
        (status = 500, description = "Server error")
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

/// Delete a category
#[utoipa::path(
    delete,
    path = "/categories/{category_id}",
    tag = "Category",
    params(
        ("category_id" = uuid::Uuid, Path, description = "Category ID")
    ),
    responses(
        (status = 204, description = "Category deleted"),
        (status = 400, description = "Permission error"),
        (status = 404, description = "Category not found"),
        (status = 500, description = "Server error")
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
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revisions: {e}")))?;

        for revision in question_revisions {
            let has_responses = app_state
                .database
                .assessments_response
                .has_responses_for_question_revision(revision.question_revision_id)
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to check responses: {e}")))?;

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
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revisions: {e}")))?;

        // Delete assessment responses that reference these question revisions
        for revision in question_revisions {
            app_state
                .database
                .assessments_response
                .delete_responses_by_question_revision_id(revision.question_revision_id)
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to delete assessment responses: {e}")))?;
        }

        // Delete question revisions first (due to foreign key constraint)
        app_state
            .database
            .questions_revisions
            .delete_revisions_by_question_id(question.question_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to delete question revisions: {e}")))?;

        // Delete the question
        app_state
            .database
            .questions
            .delete_question(question.question_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to delete question: {e}")))?;
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

/// Get a specific category catalog by ID
#[utoipa::path(
    get,
    path = "/api/category-catalog/{category_catalog_id}",
    tag = "Category Catalog",
    params(
        ("category_catalog_id" = uuid::Uuid, Path, description = "Category Catalog ID")
    ),
    responses(
        (status = 200, description = "Category catalog found", body = CategoryCatalogResponse),
        (status = 404, description = "Category catalog not found")
    )
)]
pub async fn get_specific_category_catalog(
    State(app_state): State<AppState>,
    Path(category_catalog_id): Path<Uuid>,
) -> Result<Json<CategoryCatalogResponse>, ApiError> {
    let catalog = app_state
        .database
        .category_catalog
        .get_category_catalog_by_id(category_catalog_id)
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?
        .ok_or_else(|| ApiError::NotFound("Category catalog not found".to_string()))?;

    Ok(Json(CategoryCatalogResponse {
        category_catalog: CategoryCatalog {
            category_catalog_id: catalog.category_catalog_id,
            name: catalog.name,
            description: catalog.description,
            template_id: catalog.template_id,
            is_active: catalog.is_active,
            created_at: catalog.created_at.to_rfc3339(),
            updated_at: catalog.updated_at.to_rfc3339(),
        },
    }))
}

/// Update a category catalog
#[utoipa::path(
    put,
    path = "/api/category-catalog/{category_catalog_id}",
    tag = "Category Catalog",
    params(
        ("category_catalog_id" = uuid::Uuid, Path, description = "Category Catalog ID")
    ),
    request_body = UpdateCategoryCatalogRequest,
    responses(
        (status = 200, description = "Category catalog updated", body = CategoryCatalogResponse),
        (status = 400, description = "Bad request"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Category catalog not found")
    )
)]
pub async fn update_category_catalog(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(category_catalog_id): Path<Uuid>,
    Json(request): Json<UpdateCategoryCatalogRequest>,
) -> Result<Json<CategoryCatalogResponse>, ApiError> {
    if !claims.is_super_user() {
        return Err(ApiError::Forbidden(
            "Only system administrators can update category catalogs".to_string(),
        ));
    }

    let updated_catalog = app_state
        .database
        .category_catalog
        .update_category_catalog(
            category_catalog_id,
            request.name,
            request.description,
            request.is_active,
        )
        .await
        .map_err(|e| {
            if e.to_string().contains("not found") {
                ApiError::NotFound("Category catalog not found".to_string())
            } else {
                ApiError::InternalServerError(e.to_string())
            }
        })?;

    Ok(Json(CategoryCatalogResponse {
        category_catalog: CategoryCatalog {
            category_catalog_id: updated_catalog.category_catalog_id,
            name: updated_catalog.name,
            description: updated_catalog.description,
            template_id: updated_catalog.template_id,
            is_active: updated_catalog.is_active,
            created_at: updated_catalog.created_at.to_rfc3339(),
            updated_at: updated_catalog.updated_at.to_rfc3339(),
        },
    }))
}