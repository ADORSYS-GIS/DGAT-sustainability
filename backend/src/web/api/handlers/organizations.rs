use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;

use crate::common::models::claims::Claims;
use crate::common::models::keycloak::*;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

// Query parameter structs for different endpoints
#[derive(Deserialize)]
pub struct OrganizationsQuery {
    #[serde(rename = "briefRepresentation")]
    pub brief_representation: Option<bool>,
    pub exact: Option<bool>,
    pub first: Option<i32>,
    pub max: Option<i32>,
    pub q: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct OrganizationsCountQuery {
    pub exact: Option<bool>,
    pub q: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct MembersQuery {
    pub exact: Option<bool>,
    pub first: Option<i32>,
    pub max: Option<i32>,
    #[serde(rename = "membershipType")]
    pub membership_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct MemberOrganizationsQuery {
    #[serde(rename = "briefRepresentation")]
    pub brief_representation: Option<bool>,
}

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

// Add this struct at the top of the file (if not already present):
#[derive(serde::Deserialize)]
pub struct MemberRequest {
    pub email: String,
    pub roles: Vec<String>,
}

// Get all organizations filtered according to the specified parameters
pub async fn get_organizations(
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Query(params): Query<OrganizationsQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Get all organizations first
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(mut organizations) => {
            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                organizations.retain(|org| {
                    let name_matches = org.name.to_lowercase().contains(&search_term.to_lowercase());
                    let domain_matches = org.domains.as_ref()
                        .map(|domains| domains.iter().any(|domain| 
                            domain.name.to_lowercase().contains(&search_term.to_lowercase())))
                        .unwrap_or(false);

                    if params.exact.unwrap_or(false) {
                        org.name.eq_ignore_ascii_case(search_term) || 
                        org.domains.as_ref()
                            .map(|domains| domains.iter().any(|domain| domain.name.eq_ignore_ascii_case(search_term)))
                            .unwrap_or(false)
                    } else {
                        name_matches || domain_matches
                    }
                });
            }

            // Apply pagination
            let first = params.first.unwrap_or(0) as usize;
            let max = params.max.unwrap_or(10) as usize;

            let total_count = organizations.len();
            let end = std::cmp::min(first + max, total_count);

            if first < total_count {
                organizations = organizations.into_iter().skip(first).take(max).collect();
            } else {
                organizations.clear();
            }

            // Apply brief representation if requested
            if params.brief_representation.unwrap_or(true) {
                // For brief representation, we could filter out some fields
                // but since we're returning the full KeycloakOrganization struct,
                // we'll leave this as is for now
            }

            Ok((StatusCode::OK, Json(organizations)))
        },
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
    tracing::info!(?request, "Received organization create request");
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Call Keycloak service with all required arguments
    match app_state.keycloak_service
        .create_organization(
            &token,
            &request.name,
            request.domains.clone(),
            request.redirect_url.clone(),
            request.enabled.clone(),
            request.attributes.clone(),
        )
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
    Path((realm, org_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization(&token, &org_id).await {
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
    Path(org_id): Path<String>,
    Json(request): Json<OrganizationCreateRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Prepare attributes from request
    let mut attributes = HashMap::new();

    // Add redirect URL
    attributes.insert("redirect_url".to_string(), vec![request.redirect_url.clone()]);

    // Add enabled status
    attributes.insert("enabled".to_string(), vec![request.enabled.clone()]);

    // Add custom attributes if provided
    if let Some(custom_attributes) = request.attributes.clone() {
        for (key, values) in custom_attributes {
            attributes.insert(key, values);
        }
    }

    match app_state.keycloak_service
        .update_organization(&token, &org_id, &request.name, request.domains.clone(), Some(attributes))
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
    Path(org_id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.delete_organization(&token, &org_id).await {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to delete organization: {}", e);
            Err(ApiError::InternalServerError("Failed to delete organization".to_string()))
        }
    }
}

// Get organization members filtered according to the specified parameters
pub async fn get_members(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(org_id): Path<String>,
    Query(params): Query<MembersQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization_members(&token, &org_id).await {
        Ok(mut members) => {
            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                members.retain(|member| {
                    let username_matches = member.username.to_lowercase().contains(&search_term.to_lowercase());
                    let email_matches = member.email.to_lowercase().contains(&search_term.to_lowercase());
                    let first_name_matches = member.first_name.to_lowercase().contains(&search_term.to_lowercase());
                    let last_name_matches = member.last_name.to_lowercase().contains(&search_term.to_lowercase());

                    if params.exact.unwrap_or(false) {
                        username_matches || email_matches || first_name_matches || last_name_matches
                    } else {
                        username_matches || email_matches || first_name_matches || last_name_matches
                    }
                });
            }

            // Apply pagination
            let first = params.first.unwrap_or(0) as usize;
            let max = params.max.unwrap_or(10) as usize;

            let total_count = members.len();

            if first < total_count {
                members = members.into_iter().skip(first).take(max).collect();
            } else {
                members.clear();
            }

            Ok((StatusCode::OK, Json(members)))
        },
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
    Path(org_id): Path<String>,
    Json(request): Json<MemberRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .add_user_to_organization(&token, &org_id, &request.email, request.roles.clone())
        .await
    {
        Ok(_) => Ok(StatusCode::CREATED),
        Err(e) => {
            tracing::error!("Failed to add member to organization: {}", e);
            Err(ApiError::InternalServerError("Failed to add member to organization".to_string()))
        }
    }
}

// Update a member's roles in an organization (deprecated - not in OpenAPI spec)
pub async fn update_member_roles(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, member_id)): Path<(String, String, String)>,
    Json(request): Json<KeycloakRoleAssignment>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .update_user_roles(&token, &org_id, &member_id, request.roles)
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

// Delete an invitation (deprecated - not in OpenAPI spec)
pub async fn delete_invitation(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, invitation_id)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .delete_invitation(&token, &org_id, &invitation_id)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to delete invitation: {}", e);
            Err(ApiError::InternalServerError("Failed to delete invitation".to_string()))
        }
    }
}

// NEW ENDPOINTS MATCHING OPENAPI SPECIFICATION

// Returns the organizations counts
pub async fn get_organizations_count(
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(realm): Path<String>,
    Query(params): Query<OrganizationsCountQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Get all organizations and apply the same filtering logic as get_organizations
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(mut organizations) => {
            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                organizations.retain(|org| {
                    let name_matches = org.name.to_lowercase().contains(&search_term.to_lowercase());
                    let domain_matches = org.domains.as_ref()
                        .map(|domains| domains.iter().any(|domain| 
                            domain.name.to_lowercase().contains(&search_term.to_lowercase())))
                        .unwrap_or(false);

                    if params.exact.unwrap_or(false) {
                        org.name.eq_ignore_ascii_case(search_term) || 
                        org.domains.as_ref()
                            .map(|domains| domains.iter().any(|domain| domain.name.eq_ignore_ascii_case(search_term)))
                            .unwrap_or(false)
                    } else {
                        name_matches || domain_matches
                    }
                });
            }

            let count = organizations.len() as i64;
            Ok((StatusCode::OK, Json(count)))
        },
        Err(e) => {
            tracing::error!("Failed to get organizations count: {}", e);
            Err(ApiError::InternalServerError("Failed to get organizations count".to_string()))
        }
    }
}

// Returns the organizations associated with the user that has the specified id
pub async fn get_member_organizations(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, member_id)): Path<(String, String)>,
    Query(params): Query<MemberOrganizationsQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions (can only query own organizations unless admin)
    if !claims.is_application_admin() && claims.sub != member_id {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Get all organizations and filter for ones where the user is a member
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(mut organizations) => {
            let mut member_organizations = Vec::new();

            // For each organization, check if the user is a member
            for org in organizations {
                match app_state.keycloak_service.get_organization_members(&token, &org.id).await {
                    Ok(members) => {
                        if members.iter().any(|member| member.id == member_id) {
                            member_organizations.push(org);
                        }
                    },
                    Err(_) => {
                        // Skip organizations we can't access
                        continue;
                    }
                }
            }

            // Apply brief representation if requested
            if params.brief_representation.unwrap_or(true) {
                // For brief representation, we could filter out some fields
                // but since we're returning the full KeycloakOrganization struct,
                // we'll leave this as is for now
            }

            Ok((StatusCode::OK, Json(member_organizations)))
        },
        Err(e) => {
            tracing::error!("Failed to get member organizations: {}", e);
            Err(ApiError::InternalServerError("Failed to get member organizations".to_string()))
        }
    }
}

// Returns all identity providers associated with the organization
pub async fn get_identity_providers(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // TODO: Implement logic to get identity providers for organization
    let identity_providers: Vec<serde_json::Value> = vec![];
    Ok((StatusCode::OK, Json(identity_providers)))
}

// Adds the identity provider with the specified id to the organization
pub async fn add_identity_provider(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    Json(request): Json<String>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Parse identity provider ID/alias from JSON string
    let provider_id = request.trim().trim_matches('"');

    // TODO: Implement logic to add identity provider to organization
    Ok(StatusCode::NO_CONTENT)
}

// Returns the identity provider associated with the organization that has the specified alias
pub async fn get_identity_provider(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, alias)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // TODO: Implement logic to get specific identity provider
    // For now, return 404 Not Found
    Ok(StatusCode::NOT_FOUND)
}

// Removes the identity provider with the specified alias from the organization
pub async fn remove_identity_provider(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, alias)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // TODO: Implement logic to remove identity provider from organization
    Ok(StatusCode::NO_CONTENT)
}

// Returns number of members in the organization
pub async fn get_members_count(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization_members(&token, &org_id).await {
        Ok(members) => {
            let count = members.len() as i64;
            Ok((StatusCode::OK, Json(count)))
        },
        Err(e) => {
            tracing::error!("Failed to get organization members count: {}", e);
            Err(ApiError::InternalServerError("Failed to get organization members count".to_string()))
        }
    }
}

// Invites an existing user to the organization, using the specified user id
pub async fn invite_existing_user(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    axum::extract::Form(form): axum::extract::Form<HashMap<String, String>>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let user_id = form.get("id").ok_or_else(|| ApiError::BadRequest("Missing id parameter".to_string()))?;

    // TODO: Implement logic to invite existing user
    Ok(StatusCode::NO_CONTENT)
}

// Invites an existing user or sends a registration link to a new user, based on the provided e-mail address
pub async fn invite_user(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    axum::extract::Form(form): axum::extract::Form<HashMap<String, String>>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let email = form.get("email").ok_or_else(|| ApiError::BadRequest("Missing email parameter".to_string()))?;
    let first_name = form.get("firstName");
    let last_name = form.get("lastName");

    // TODO: Implement logic to invite user by email
    Ok(StatusCode::NO_CONTENT)
}

// Returns the member of the organization with the specified id
pub async fn get_member(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, member_id)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service.get_organization_members(&token, &org_id).await {
        Ok(members) => {
            // Find the specific member by ID
            if let Some(member) = members.iter().find(|m| m.id == member_id) {
                Ok((StatusCode::OK, Json(member.clone())))
            } else {
                Err(ApiError::BadRequest("Member not found in organization".to_string()))
            }
        },
        Err(e) => {
            tracing::error!("Failed to get organization member: {}", e);
            Err(ApiError::InternalServerError("Failed to get organization member".to_string()))
        }
    }
}

// Returns the organizations associated with the user that has the specified id (within org context)
pub async fn get_member_organizations_in_org(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_, org_id, member_id)): Path<(String, String, String)>,
    Query(params): Query<MemberOrganizationsQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // First verify that the member exists in the specified organization
    match app_state.keycloak_service.get_organization_members(&token, &org_id).await {
        Ok(members) => {
            if !members.iter().any(|m| m.id == member_id) {
                return Err(ApiError::BadRequest("Member not found in organization".to_string()));
            }
        },
        Err(e) => {
            tracing::error!("Failed to get organization members: {}", e);
            return Err(ApiError::InternalServerError("Failed to get organization members".to_string()));
        }
    }

    // Now get all organizations where this member belongs (same logic as get_member_organizations)
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(organizations) => {
            let mut member_organizations = Vec::new();

            // For each organization, check if the user is a member
            for org in organizations {
                match app_state.keycloak_service.get_organization_members(&token, &org.id).await {
                    Ok(members) => {
                        if members.iter().any(|member| member.id == member_id) {
                            member_organizations.push(org);
                        }
                    },
                    Err(_) => {
                        // Skip organizations we can't access
                        continue;
                    }
                }
            }

            // Apply brief representation if requested
            if params.brief_representation.unwrap_or(true) {
                // For brief representation, we could filter out some fields
                // but since we're returning the full KeycloakOrganization struct,
                // we'll leave this as is for now
            }

            Ok((StatusCode::OK, Json(member_organizations)))
        },
        Err(e) => {
            tracing::error!("Failed to get member organizations: {}", e);
            Err(ApiError::InternalServerError("Failed to get member organizations".to_string()))
        }
    }
}

// Update the remove_member handler to expect only org_id and membership_id
pub async fn remove_member(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((org_id, membership_id)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state.keycloak_service
        .remove_user_from_organization(&token, &org_id, &membership_id)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to remove member from organization: {}", e);
            Err(ApiError::InternalServerError("Failed to remove member from organization".to_string()))
        }
    }
}
