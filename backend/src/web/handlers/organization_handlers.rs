//! Organization Management Handlers
//! 
//! This module provides HTTP handlers for organization management operations.
//! It implements role-based access control where:
//! - application_admin can manage all organizations
//! - organization_admin can only manage their own organization

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    Extension,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::common::models::organization::{OrganizationRequest, OrganizationResponse, UserRequest, UserResponse};
use crate::web::handlers::admin_client::keycloak::{KeycloakAdminClient, KeycloakError};

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn error(message: String) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            message: Some(message),
        }
    }
}

/// Create a new organization (application_admin only)
pub async fn create_organization(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Json(org_request): Json<OrganizationRequest>,
) -> Result<Json<ApiResponse<OrganizationResponse>>, StatusCode> {
    // Only application_admin can create organizations
    if !claims.is_application_admin() {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.create_organization(org_request).await {
        Ok(org) => Ok(Json(ApiResponse::success(org))),
        Err(e) => {
            tracing::error!("Failed to create organization: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// List all organizations
pub async fn list_organizations(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Query(_pagination): Query<PaginationQuery>,
) -> Result<Json<ApiResponse<Vec<OrganizationResponse>>>, StatusCode> {
    let client = keycloak_client.lock().await;
    
    match client.list_organizations().await {
        Ok(mut organizations) => {
            // If user is organization_admin, filter to only their organization
            if claims.is_organization_admin() && !claims.is_application_admin() {
                if let Some(user_org_id) = &claims.organization_id {
                    organizations.retain(|org| org.id == *user_org_id);
                } else {
                    organizations.clear();
                }
            }
            
            Ok(Json(ApiResponse::success(organizations)))
        }
        Err(e) => {
            tracing::error!("Failed to list organizations: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get organization by ID
pub async fn get_organization(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(org_id): Path<String>,
) -> Result<Json<ApiResponse<OrganizationResponse>>, StatusCode> {
    // Check if user can access this organization
    if !claims.can_manage_organization(&org_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.get_organization(&org_id).await {
        Ok(org) => Ok(Json(ApiResponse::success(org))),
        Err(KeycloakError::OrganizationNotFound(_)) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to get organization: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Update organization
pub async fn update_organization(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(org_id): Path<String>,
    Json(org_request): Json<OrganizationRequest>,
) -> Result<Json<ApiResponse<OrganizationResponse>>, StatusCode> {
    // Check if user can manage this organization
    if !claims.can_manage_organization(&org_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.update_organization(&org_id, org_request).await {
        Ok(org) => Ok(Json(ApiResponse::success(org))),
        Err(KeycloakError::OrganizationNotFound(_)) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to update organization: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Delete organization (application_admin only)
pub async fn delete_organization(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(org_id): Path<String>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    // Only application_admin can delete organizations
    if !claims.is_application_admin() {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.delete_organization(&org_id).await {
        Ok(_) => Ok(Json(ApiResponse::success(()))),
        Err(KeycloakError::OrganizationNotFound(_)) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to delete organization: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create organization admin user (application_admin only)
pub async fn create_organization_admin(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Json(user_request): Json<UserRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, StatusCode> {
    // Only application_admin can create organization admins
    if !claims.is_application_admin() {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.create_organization_admin(user_request).await {
        Ok(user) => Ok(Json(ApiResponse::success(user))),
        Err(e) => {
            tracing::error!("Failed to create organization admin: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Create user in organization
pub async fn create_user(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Json(user_request): Json<UserRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, StatusCode> {
    // Check if user can manage this organization
    if !claims.can_manage_organization(&user_request.organization_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.create_user_in_organization(user_request).await {
        Ok(user) => Ok(Json(ApiResponse::success(user))),
        Err(e) => {
            tracing::error!("Failed to create user: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// List users in organization
pub async fn list_organization_users(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(org_id): Path<String>,
    Query(_pagination): Query<PaginationQuery>,
) -> Result<Json<ApiResponse<Vec<UserResponse>>>, StatusCode> {
    // Check if user can access this organization
    if !claims.can_manage_organization(&org_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    let client = keycloak_client.lock().await;
    match client.list_organization_users(&org_id).await {
        Ok(users) => Ok(Json(ApiResponse::success(users))),
        Err(KeycloakError::OrganizationNotFound(_)) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to list organization users: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get user by ID
pub async fn get_user(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<UserResponse>>, StatusCode> {
    let client = keycloak_client.lock().await;
    
    // First get the user to check their organization
    let user = match client.get_user(&user_id).await {
        Ok(user) => user,
        Err(KeycloakError::UserNotFound(_)) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to get user: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Check if the requesting user can access this user's organization
    if !claims.can_manage_organization(&user.organization_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(Json(ApiResponse::success(user)))
}

/// Delete user
pub async fn delete_user(
    State(keycloak_client): State<Arc<Mutex<KeycloakAdminClient>>>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let client = keycloak_client.lock().await;
    
    // First get the user to check their organization
    let user = match client.get_user(&user_id).await {
        Ok(user) => user,
        Err(KeycloakError::UserNotFound(_)) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to get user for deletion check: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Check if the requesting user can manage this user's organization
    if !claims.can_manage_organization(&user.organization_id) {
        return Err(StatusCode::FORBIDDEN);
    }

    match client.delete_user(&user_id).await {
        Ok(_) => Ok(Json(ApiResponse::success(()))),
        Err(e) => {
            tracing::error!("Failed to delete user: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}