use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::collections::HashMap;

use crate::common::models::claims::Claims;
use crate::common::models::keycloak::*;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

// Helper function to extract token from request extensions
fn get_token_from_extensions(token: &str) -> Result<String, ApiError> {
    Ok(token.to_string())
}

// Helper function to check if user can access organization (read permissions)
fn can_access_organization(claims: &Claims, organization_id: &str) -> bool {
    // User can access organization if they are:
    // 1. Application admin (can access all organizations)
    // 2. Organization admin and member of the organization
    // 3. Regular user and member of the organization
    claims.is_application_admin() 
        || claims.organizations.orgs.contains_key(organization_id)
}

// Get all organizations the current user is a member of
pub async fn get_organizations(
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(organizations) => Ok((StatusCode::OK, Json(organizations))),
        Err(e) => {
            tracing::error!("Failed to get organizations: {}", e);
            Err(ApiError::InternalServerError("Failed to get organizations".to_string()))
        }
    }
}

// Create a new organization
pub async fn create_organization(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Json(request): Json<OrganizationCreateRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Prepare attributes from request
    let mut attributes = HashMap::new();
    attributes.insert("domain".to_string(), vec![request.domain]);
    attributes.insert("redirect_url".to_string(), vec![request.redirect_url]);
    if let Some(description) = request.description {
        attributes.insert("description".to_string(), vec![description]);
    }

    match app_state.keycloak_service
        .create_organization(&token, &request.name, Some(attributes))
        .await
    {
        Ok(organization) => Ok((StatusCode::CREATED, Json(organization))),
        Err(e) => {
            tracing::error!("Failed to create organization: {}", e);
            Err(ApiError::InternalServerError("Failed to create organization".to_string()))
        }
    }
}

// Get a specific organization
pub async fn get_organization(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization(&token, &id).await {
        Ok(organization) => Ok((StatusCode::OK, Json(organization))),
        Err(e) => {
            tracing::error!("Failed to get organization: {}", e);
            Err(ApiError::InternalServerError("Failed to get organization".to_string()))
        }
    }
}

// Update an organization
pub async fn update_organization(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<OrganizationCreateRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Prepare attributes from request
    let mut attributes = HashMap::new();
    attributes.insert("domain".to_string(), vec![request.domain]);
    attributes.insert("redirect_url".to_string(), vec![request.redirect_url]);
    if let Some(description) = request.description {
        attributes.insert("description".to_string(), vec![description]);
    }

    match app_state.keycloak_service
        .update_organization(&token, &id, &request.name, Some(attributes))
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to update organization: {}", e);
            Err(ApiError::InternalServerError("Failed to update organization".to_string()))
        }
    }
}

// Delete an organization
pub async fn delete_organization(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.delete_organization(&token, &id).await {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to delete organization: {}", e);
            Err(ApiError::InternalServerError("Failed to delete organization".to_string()))
        }
    }
}

// Get organization members
pub async fn get_members(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization_members(&token, &id).await {
        Ok(members) => Ok((StatusCode::OK, Json(members))),
        Err(e) => {
            tracing::error!("Failed to get organization members: {}", e);
            Err(ApiError::InternalServerError("Failed to get organization members".to_string()))
        }
    }
}

// Add a member to an organization
pub async fn add_member(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<MemberRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .add_user_to_organization(&token, &id, &request.user_id, request.roles)
        .await
    {
        Ok(membership) => Ok((StatusCode::CREATED, Json(membership))),
        Err(e) => {
            tracing::error!("Failed to add member to organization: {}", e);
            Err(ApiError::InternalServerError("Failed to add member to organization".to_string()))
        }
    }
}

// Remove a member from an organization
pub async fn remove_member(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((id, membership_id)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .remove_user_from_organization(&token, &id, &membership_id)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to remove member from organization: {}", e);
            Err(ApiError::InternalServerError("Failed to remove member from organization".to_string()))
        }
    }
}

// Update a member's roles in an organization
pub async fn update_member_roles(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((id, membership_id)): Path<(String, String)>,
    Json(request): Json<KeycloakRoleAssignment>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .update_user_roles(&token, &id, &membership_id, request.roles)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to update member roles: {}", e);
            Err(ApiError::InternalServerError("Failed to update member roles".to_string()))
        }
    }
}

// Get all invitations for an organization
pub async fn get_invitations(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_invitations(&token, &id).await {
        Ok(invitations) => Ok((StatusCode::OK, Json(invitations))),
        Err(e) => {
            tracing::error!("Failed to get invitations: {}", e);
            Err(ApiError::InternalServerError("Failed to get invitations".to_string()))
        }
    }
}

// Create an invitation to an organization
pub async fn create_invitation(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<InvitationRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .create_invitation(&token, &id, &request.email, request.roles, request.expiration)
        .await
    {
        Ok(invitation) => Ok((StatusCode::CREATED, Json(invitation))),
        Err(e) => {
            tracing::error!("Failed to create invitation: {}", e);
            Err(ApiError::InternalServerError("Failed to create invitation".to_string()))
        }
    }
}

// Delete an invitation
pub async fn delete_invitation(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((id, invitation_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .delete_invitation(&token, &id, &invitation_id)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to delete invitation: {}", e);
            Err(ApiError::InternalServerError("Failed to delete invitation".to_string()))
        }
    }
}
