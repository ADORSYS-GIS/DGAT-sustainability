use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{
    AssignCategoriesToOrganizationRequest, CategoryCatalog, CategoryCatalogListResponse,
    CategoryCatalogResponse, CreateCategoryCatalogRequest, OrganizationCategory,
    OrganizationCategoryListResponse, OrganizationCategoryResponse,
    UpdateOrganizationCategoryRequest,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Extension, Json,
};
use uuid::Uuid;

// =============== Category Catalog Handlers ===============

/// Get all active category catalogs
#[utoipa::path(
    get,
    path = "/category-catalog",
    responses(
        (status = 200, description = "List of active category catalogs", body = CategoryCatalogListResponse)
    )
)]
pub async fn get_category_catalogs(
    State(app_state): State<AppState>,
) -> Result<impl IntoResponse, ApiError> {
    let category_catalog_service = &app_state.database.category_catalog;
    
    let category_catalogs = category_catalog_service
        .get_all_active_categories()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get category catalogs: {e}")))?;

    let response_catalogs: Vec<CategoryCatalog> = category_catalogs
        .into_iter()
        .map(|cat| CategoryCatalog {
            category_catalog_id: cat.category_catalog_id,
            name: cat.name,
            description: cat.description,
            template_id: cat.template_id,
            is_active: cat.is_active,
            created_at: cat.created_at.to_rfc3339(),
            updated_at: cat.updated_at.to_rfc3339(),
        })
        .collect();

    Ok((StatusCode::OK, Json(CategoryCatalogListResponse {
        category_catalogs: response_catalogs,
    })))
}

/// Create a new category catalog entry
#[utoipa::path(
    post,
    path = "/category-catalog",
    responses(
        (status = 201, description = "Category catalog created successfully", body = CategoryCatalogResponse)
    )
)]
pub async fn create_category_catalog(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateCategoryCatalogRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if user has permission to create category catalogs (only drgv_admin)
    if !claims.is_super_user() {
        return Err(ApiError::BadRequest(
            "Only system administrators can create category catalogs".to_string(),
        ));
    }

    // Validate request
    if request.name.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Category catalog name must not be empty".to_string(),
        ));
    }

    let category_catalog_service = &app_state.database.category_catalog;
    
    let category_catalog_id = Uuid::new_v4();
    let category_catalog_model = category_catalog_service
        .create_category_catalog(
            category_catalog_id,
            request.name,
            request.description,
            request.template_id,
            request.is_active.unwrap_or(true),
        )
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create category catalog: {e}")))?;

    let category_catalog = CategoryCatalog {
        category_catalog_id: category_catalog_model.category_catalog_id,
        name: category_catalog_model.name,
        description: category_catalog_model.description,
        template_id: category_catalog_model.template_id,
        is_active: category_catalog_model.is_active,
        created_at: category_catalog_model.created_at.to_rfc3339(),
        updated_at: category_catalog_model.updated_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(CategoryCatalogResponse { category_catalog })))
}

// =============== Organization Categories Handlers ===============

/// Get organization categories by Keycloak organization ID
#[utoipa::path(
    get,
    path = "/organizations/{keycloak_organization_id}/categories",
    responses(
        (status = 200, description = "List of organization categories", body = OrganizationCategoryListResponse)
    ),
    params(
        ("keycloak_organization_id" = String, Path, description = "Keycloak Organization ID")
    )
)]
pub async fn get_organization_categories(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(keycloak_organization_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if user has permission to view organization categories
    if !claims.is_application_admin() && !is_member_of_org_by_id(&claims, &keycloak_organization_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let organization_categories_service = &app_state.database.organization_categories;
    let category_catalog_service = &app_state.database.category_catalog;
    
    let organization_categories = organization_categories_service
        .get_organization_categories_by_keycloak_organization_id(&keycloak_organization_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get organization categories: {e}")))?;

    let mut response_categories = Vec::new();
    for org_cat in organization_categories {
        // Get category catalog details
        let category_catalog = category_catalog_service
            .get_category_catalog_by_id(org_cat.category_catalog_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to get category catalog: {e}")))?;

        if let Some(cat_catalog) = category_catalog {
            let organization_category = OrganizationCategory {
                organization_category_id: org_cat.organization_category_id,
                keycloak_organization_id: org_cat.keycloak_organization_id,
                category_catalog_id: org_cat.category_catalog_id,
                category_name: cat_catalog.name,
                weight: org_cat.weight,
                order: org_cat.order,
                created_at: org_cat.created_at.to_rfc3339(),
                updated_at: org_cat.updated_at.to_rfc3339(),
            };
            response_categories.push(organization_category);
        }
    }

    Ok((StatusCode::OK, Json(OrganizationCategoryListResponse {
        organization_categories: response_categories,
    })))
}

/// Assign categories to an organization with equal weight distribution
#[utoipa::path(
    post,
    path = "/organizations/{keycloak_organization_id}/categories/assign",
    responses(
        (status = 201, description = "Categories assigned successfully", body = OrganizationCategoryListResponse)
    ),
    params(
        ("keycloak_organization_id" = String, Path, description = "Keycloak Organization ID")
    )
)]
pub async fn assign_categories_to_organization(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(keycloak_organization_id): Path<String>,
    Json(request): Json<AssignCategoriesToOrganizationRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if user has permission to assign categories (only drgv_admin)
    if !claims.is_super_user() {
        return Err(ApiError::BadRequest(
            "Only system administrators can assign categories to organizations".to_string(),
        ));
    }

    if request.category_catalog_ids.is_empty() {
        return Err(ApiError::BadRequest(
            "At least one category must be selected".to_string(),
        ));
    }

    let organization_categories_service = &app_state.database.organization_categories;
    
    // First, remove existing categories for this organization
    organization_categories_service
        .delete_organization_categories_by_keycloak_organization_id(&keycloak_organization_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to clear existing categories: {e}")))?;

    // Calculate weights - distribute equally if not provided
    let category_count = request.category_catalog_ids.len() as i32;
    let equal_weight = 100 / category_count;
    let remainder = 100 % category_count;
    
    let weights = if let Some(provided_weights) = request.weights {
        if provided_weights.len() != request.category_catalog_ids.len() {
            return Err(ApiError::BadRequest(
                "Number of weights must match number of categories".to_string(),
            ));
        }
        
        let total_weight: i32 = provided_weights.iter().sum();
        if total_weight != 100 {
            return Err(ApiError::BadRequest(
                "Total weight must equal 100".to_string(),
            ));
        }
        
        provided_weights
    } else {
        // Distribute weights equally
        let mut weights = vec![equal_weight; category_count as usize];
        // Add remainder to first category
        if remainder > 0 {
            weights[0] += remainder;
        }
        weights
    };

    // Create organization categories
    let mut response_categories = Vec::new();
    for (index, category_catalog_id) in request.category_catalog_ids.iter().enumerate() {
        let organization_category_id = Uuid::new_v4();
        let weight = weights[index];
        let order = (index + 1) as i32;

        let org_cat = organization_categories_service
            .create_organization_category(
                organization_category_id,
                keycloak_organization_id.clone(),
                *category_catalog_id,
                weight,
                order,
            )
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to create organization category: {e}")))?;

        // Get category name for response
        let category_catalog_service = &app_state.database.category_catalog;
        let category_catalog = category_catalog_service
            .get_category_catalog_by_id(*category_catalog_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to get category catalog: {e}")))?;

        if let Some(cat_catalog) = category_catalog {
            let organization_category = OrganizationCategory {
                organization_category_id: org_cat.organization_category_id,
                keycloak_organization_id: org_cat.keycloak_organization_id,
                category_catalog_id: org_cat.category_catalog_id,
                category_name: cat_catalog.name,
                weight: org_cat.weight,
                order: org_cat.order,
                created_at: org_cat.created_at.to_rfc3339(),
                updated_at: org_cat.updated_at.to_rfc3339(),
            };
            response_categories.push(organization_category);
        }
    }

    Ok((StatusCode::CREATED, Json(OrganizationCategoryListResponse {
        organization_categories: response_categories,
    })))
}

/// Update organization category weight
#[utoipa::path(
    put,
    path = "/organizations/{keycloak_organization_id}/categories/{organization_category_id}",
    responses(
        (status = 200, description = "Organization category updated successfully", body = OrganizationCategoryResponse)
    ),
    params(
        ("keycloak_organization_id" = String, Path, description = "Keycloak Organization ID"),
        ("organization_category_id" = Uuid, Path, description = "Organization Category ID")
    )
)]
pub async fn update_organization_category(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((keycloak_organization_id, organization_category_id)): Path<(String, Uuid)>,
    Json(request): Json<UpdateOrganizationCategoryRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if user has permission to update organization categories
    if !claims.is_application_admin() && !is_member_of_org_by_id(&claims, &keycloak_organization_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Validate weight if provided
    if let Some(weight) = request.weight {
        if weight <= 0 || weight > 100 {
            return Err(ApiError::BadRequest(
                "Category weight must be between 1 and 100".to_string(),
            ));
        }
    }

    let organization_categories_service = &app_state.database.organization_categories;
    
    // Update the organization category
    let org_cat = organization_categories_service
        .update_organization_category(organization_category_id, request.weight, request.order)
        .await
        .map_err(|e| {
            if e.to_string().contains("not found") {
                ApiError::NotFound("Organization category not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update organization category: {e}"))
            }
        })?;

    // Get category name for response
    let category_catalog_service = &app_state.database.category_catalog;
    let category_catalog = category_catalog_service
        .get_category_catalog_by_id(org_cat.category_catalog_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get category catalog: {e}")))?;

    let category_name = category_catalog
        .map(|cat| cat.name)
        .unwrap_or_else(|| "Unknown Category".to_string());

    let organization_category = OrganizationCategory {
        organization_category_id: org_cat.organization_category_id,
        keycloak_organization_id: org_cat.keycloak_organization_id,
        category_catalog_id: org_cat.category_catalog_id,
        category_name,
        weight: org_cat.weight,
        order: org_cat.order,
        created_at: org_cat.created_at.to_rfc3339(),
        updated_at: org_cat.updated_at.to_rfc3339(),
    };

    Ok((StatusCode::OK, Json(OrganizationCategoryResponse { organization_category })))
}

// Helper function to check if user is member of organization
fn is_member_of_org_by_id(claims: &Claims, org_id: &str) -> bool {
    if let Some(organizations) = &claims.organizations {
        organizations.orgs.values().any(|org_info| {
            org_info.id.as_ref().map_or(false, |id| id == org_id)
        })
    } else {
        false
    }
}

