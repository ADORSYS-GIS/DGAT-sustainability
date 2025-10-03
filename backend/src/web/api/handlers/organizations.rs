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
use crate::web::api::error::ApiError;
use crate::web::api::models::*;
use crate::web::routes::AppState;

// Query parameter structs for different endpoints
#[derive(Deserialize, utoipa::IntoParams)]
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
        || claims
            .organizations
            .as_ref()
            .map(|orgs| orgs.orgs.contains_key(organization_id))
            .unwrap_or(false)
}

// Add this struct at the top of the file (if not already present):
#[derive(serde::Deserialize)]
pub struct MemberRequest {
    pub email: String,
    pub roles: Vec<String>,
}

// Helper to check if user is a member of org by org_id
fn is_member_of_org_by_id(claims: &Claims, org_id: &str) -> bool {
    // Application admins bypass organization membership checks
    if claims.is_application_admin() {
        return true;
    }
    claims
        .organizations
        .as_ref()
        .map(|orgs| {
            orgs.orgs
                .values()
                .any(|info| info.id.as_deref() == Some(org_id))
        })
        .unwrap_or(false)
}

// Get all organizations filtered according to the specified parameters
#[utoipa::path(
    get,
    path = "/organizations",
    responses(
        (status = 200, description = "Get all organizations", body = [Organization])
    ),
    params(
        OrganizationsQuery
    )
)]
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
            // Log organization details for debugging
            for org in &organizations {
                tracing::warn!(
                    "Organization: id={}, name={}, attributes={:?}",
                    org.id,
                    org.name,
                    org.attributes
                );
            }

            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                organizations.retain(|org| {
                    let name_matches = org
                        .name
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());
                    let domain_matches = org
                        .domains
                        .as_ref()
                        .map(|domains| {
                            domains.iter().any(|domain| {
                                domain
                                    .name
                                    .to_lowercase()
                                    .contains(&search_term.to_lowercase())
                            })
                        })
                        .unwrap_or(false);

                    if params.exact.unwrap_or(false) {
                        org.name.eq_ignore_ascii_case(search_term)
                            || org
                                .domains
                                .as_ref()
                                .map(|domains| {
                                    domains
                                        .iter()
                                        .any(|domain| domain.name.eq_ignore_ascii_case(search_term))
                                })
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
            let _end = std::cmp::min(first + max, total_count);

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
        }
        Err(e) => {
            tracing::error!("Failed to get organizations: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organizations".to_string(),
            ))
        }
    }
}

// Create a new organization
#[utoipa::path(
    post,
    path = "/organizations",
    request_body = OrganizationCreateRequest,
    responses(
        (status = 201, description = "Create a new organization", body = Organization)
    )
)]
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
    match app_state
        .keycloak_service
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
        Ok(organization) => {
            // If categories are provided in attributes, assign them to the organization
            if let Some(attributes) = &request.attributes {
                if let Some(categories) = attributes.get("categories") {
                    // categories is already a Vec<String>
                    let category_names = categories.clone();
                    
                    if !category_names.is_empty() {
                        // Convert category names to category catalog IDs and assign with equal weights
                        let category_catalog_service = &app_state.database.category_catalog;
                        let organization_categories_service = &app_state.database.organization_categories;
                        
                        let mut category_catalog_ids = Vec::new();
                        for name in category_names {
                            // Find category catalog by name
                            let all_catalogs = category_catalog_service
                                .get_all_active_categories()
                                .await
                                .map_err(|e| {
                                    tracing::error!("Failed to get category catalogs: {}", e);
                                    ApiError::InternalServerError("Failed to get category catalogs".to_string())
                                })?;
                            
                            if let Some(catalog) = all_catalogs.iter().find(|cat| cat.name == name) {
                                category_catalog_ids.push(catalog.category_catalog_id);
                            }
                        }
                        
                        if !category_catalog_ids.is_empty() {
                            // Calculate equal weights
                            let category_count = category_catalog_ids.len() as i32;
                            let equal_weight = 100 / category_count;
                            let remainder = 100 % category_count;
                            
                            // Create organization categories with equal weights
                            for (index, category_catalog_id) in category_catalog_ids.iter().enumerate() {
                                let organization_category_id = uuid::Uuid::new_v4();
                                let mut weight = equal_weight;
                                // Add remainder to first category
                                if index == 0 && remainder > 0 {
                                    weight += remainder;
                                }
                                let order = (index + 1) as i32;
                                
                                if let Err(e) = organization_categories_service
                                    .create_organization_category(
                                        organization_category_id,
                                        organization.id.clone(),
                                        *category_catalog_id,
                                        weight,
                                        order,
                                    )
                                    .await
                                {
                                    tracing::error!("Failed to create organization category: {}", e);
                                    // Don't fail the entire operation, just log the error
                                }
                            }
                        }
                    }
                }
            }
            
            Ok((StatusCode::CREATED, Json(organization)))
        },
        Err(e) => {
            tracing::error!("Failed to create organization: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to create organization".to_string(),
            ))
        }
    }
}

// Get a specific organization
#[utoipa::path(
    get,
    path = "/organizations/{org_id}",
    responses(
        (status = 200, description = "Get a specific organization", body = Organization)
    ),
    params(
        ("org_id" = String, Path, description = "Organization ID")
    )
)]
pub async fn get_organization(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((_realm, org_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !can_access_organization(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    match app_state
        .keycloak_service
        .get_organization(&token, &org_id)
        .await
    {
        Ok(organization) => {
            tracing::warn!("Single organization response: {:?}", organization);
            Ok((StatusCode::OK, Json(organization)))
        }
        Err(e) => {
            tracing::error!("Failed to get organization: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organization".to_string(),
            ))
        }
    }
}

// Update an organization
#[utoipa::path(
    put,
    path = "/organizations/{org_id}",
    request_body = OrganizationCreateRequest,
    responses(
        (status = 204, description = "Update an organization")
    ),
    params(
        ("org_id" = String, Path, description = "Organization ID")
    )
)]
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
    attributes.insert(
        "redirect_url".to_string(),
        vec![request.redirect_url.clone()],
    );

    // Add enabled status
    attributes.insert("enabled".to_string(), vec![request.enabled.clone()]);

    // Add custom attributes if provided
    if let Some(custom_attributes) = request.attributes.clone() {
        for (key, values) in custom_attributes {
            attributes.insert(key, values);
        }
    }

    match app_state
        .keycloak_service
        .update_organization(
            &token,
            &org_id,
            &request.name,
            request.domains.clone(),
            Some(attributes),
        )
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to update organization: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to update organization".to_string(),
            ))
        }
    }
}

// Delete an organization
#[utoipa::path(
    delete,
    path = "/organizations/{org_id}",
    responses(
        (status = 204, description = "Delete an organization")
    ),
    params(
        ("org_id" = String, Path, description = "Organization ID")
    )
)]
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

    // First, get all members of the organization
    let members = match app_state
        .keycloak_service
        .get_organization_members(&token, &org_id)
        .await
    {
        Ok(members) => members,
        Err(e) => {
            tracing::error!("Failed to get organization members for deletion: {}", e);
            return Err(ApiError::InternalServerError(
                "Failed to get organization members for deletion".to_string(),
            ));
        }
    };

    // Iterate and delete each member
    for member in members {
        tracing::info!(
            "Attempting to delete user {} from Keycloak as part of organization deletion",
            member.id
        );
        if let Err(e) = app_state
            .keycloak_service
            .delete_user(&token, &member.id)
            .await
        {
            tracing::warn!(
                "Failed to delete user {} from Keycloak: {}. Continuing with other users.",
                member.id,
                e
            );
            // We log the error but continue to attempt deleting other users and the organization.
            // A full rollback/transaction is complex with external services like Keycloak.
        }
    }

    // Finally, delete the organization
    match app_state
        .keycloak_service
        .delete_organization(&token, &org_id)
        .await
    {
        Ok(()) => {
            tracing::info!(
                "Organization {} and all its associated users deleted successfully",
                org_id
            );
            Ok(StatusCode::NO_CONTENT)
        }
        Err(e) => {
            tracing::error!("Failed to delete organization {}: {}", org_id, e);
            Err(ApiError::InternalServerError(
                "Failed to delete organization".to_string(),
            ))
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

    // Get organization members filtered by org_admin role
    match app_state
        .keycloak_service
        .get_organization_members_by_role(&token, &org_id, "org_admin")
        .await
    {
        Ok(mut members) => {
            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                members.retain(|member| {
                    let username_matches = member
                        .username
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());
                    let email_matches = member
                        .email
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());
                    let first_name_matches = member
                        .first_name
                        .as_deref()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());
                    let last_name_matches = member
                        .last_name
                        .as_deref()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());

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
        }
        Err(e) => {
            tracing::error!("Failed to get organization members: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organization members".to_string(),
            ))
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

    match app_state
        .keycloak_service
        .add_user_to_organization(&token, &org_id, &request.email, request.roles.clone())
        .await
    {
        Ok(_) => Ok(StatusCode::CREATED),
        Err(e) => {
            tracing::error!("Failed to add member to organization: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to add member to organization".to_string(),
            ))
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

    match app_state
        .keycloak_service
        .update_user_roles(&token, &org_id, &member_id, request.roles)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to update member roles: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to update member roles".to_string(),
            ))
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

    match app_state
        .keycloak_service
        .get_invitations(&token, &id)
        .await
    {
        Ok(invitations) => Ok((StatusCode::OK, Json(invitations))),
        Err(e) => {
            tracing::error!("Failed to get invitations: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get invitations".to_string(),
            ))
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

    match app_state
        .keycloak_service
        .create_invitation(
            &token,
            &id,
            &request.email,
            request.roles,
            request.expiration,
        )
        .await
    {
        Ok(invitation) => Ok((StatusCode::CREATED, Json(invitation))),
        Err(e) => {
            tracing::error!("Failed to create invitation: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to create invitation".to_string(),
            ))
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

    match app_state
        .keycloak_service
        .delete_invitation(&token, &org_id, &invitation_id)
        .await
    {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Failed to delete invitation: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to delete invitation".to_string(),
            ))
        }
    }
}

// NEW ENDPOINTS MATCHING OPENAPI SPECIFICATION

// Returns the organizations counts
pub async fn get_organizations_count(
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(_realm): Path<String>,
    Query(params): Query<OrganizationsCountQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;

    // Get all organizations and apply the same filtering logic as get_organizations
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(mut organizations) => {
            // Apply search filtering if provided
            if let Some(search_term) = &params.search {
                organizations.retain(|org| {
                    let name_matches = org
                        .name
                        .to_lowercase()
                        .contains(&search_term.to_lowercase());
                    let domain_matches = org
                        .domains
                        .as_ref()
                        .map(|domains| {
                            domains.iter().any(|domain| {
                                domain
                                    .name
                                    .to_lowercase()
                                    .contains(&search_term.to_lowercase())
                            })
                        })
                        .unwrap_or(false);

                    if params.exact.unwrap_or(false) {
                        org.name.eq_ignore_ascii_case(search_term)
                            || org
                                .domains
                                .as_ref()
                                .map(|domains| {
                                    domains
                                        .iter()
                                        .any(|domain| domain.name.eq_ignore_ascii_case(search_term))
                                })
                                .unwrap_or(false)
                    } else {
                        name_matches || domain_matches
                    }
                });
            }

            let count = organizations.len() as i64;
            Ok((StatusCode::OK, Json(count)))
        }
        Err(e) => {
            tracing::error!("Failed to get organizations count: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organizations count".to_string(),
            ))
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
        Ok(organizations) => {
            let mut member_organizations = Vec::new();

            // For each organization, check if the user is a member
            for org in organizations {
                match app_state
                    .keycloak_service
                    .get_organization_members(&token, &org.id)
                    .await
                {
                    Ok(members) => {
                        if members.iter().any(|member| member.id == member_id) {
                            member_organizations.push(org);
                        }
                    }
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
        }
        Err(e) => {
            tracing::error!("Failed to get member organizations: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get member organizations".to_string(),
            ))
        }
    }
}

// Returns all identity providers associated with the organization
pub async fn get_identity_providers(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(_app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

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
    State(_app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    Json(request): Json<String>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Parse identity provider ID/alias from JSON string
    let _provider_id = request.trim().trim_matches('"');

    // TODO: Implement logic to add identity provider to organization
    Ok(StatusCode::NO_CONTENT)
}

// Returns the identity provider associated with the organization that has the specified alias
pub async fn get_identity_provider(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(_app_state): State<AppState>,
    Path((_, org_id, _alias)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

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
    State(_app_state): State<AppState>,
    Path((_, org_id, _alias)): Path<(String, String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

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

    // Get organization members filtered by org_admin role
    match app_state
        .keycloak_service
        .get_organization_members_by_role(&token, &org_id, "org_admin")
        .await
    {
        Ok(members) => {
            let count = members.len() as i64;
            Ok((StatusCode::OK, Json(count)))
        }
        Err(e) => {
            tracing::error!("Failed to get organization members count: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organization members count".to_string(),
            ))
        }
    }
}

// Invites an existing user to the organization, using the specified user id
pub async fn invite_existing_user(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(_app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    axum::extract::Form(form): axum::extract::Form<HashMap<String, String>>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let _user_id = form
        .get("id")
        .ok_or_else(|| ApiError::BadRequest("Missing id parameter".to_string()))?;

    // TODO: Implement logic to invite existing user
    Ok(StatusCode::NO_CONTENT)
}

// Invites an existing user or sends a registration link to a new user, based on the provided e-mail address
pub async fn invite_user(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(_app_state): State<AppState>,
    Path((_, org_id)): Path<(String, String)>,
    axum::extract::Form(form): axum::extract::Form<HashMap<String, String>>,
) -> Result<impl IntoResponse, ApiError> {
    let _token = get_token_from_extensions(&token)?;

    // Check if user has appropriate permissions
    if !claims.can_manage_organization(&org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let _email = form
        .get("email")
        .ok_or_else(|| ApiError::BadRequest("Missing email parameter".to_string()))?;
    let _first_name = form.get("firstName");
    let _last_name = form.get("lastName");

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

    // Get organization members filtered by org_admin role
    match app_state
        .keycloak_service
        .get_organization_members_by_role(&token, &org_id, "org_admin")
        .await
    {
        Ok(members) => {
            // Find the specific member by ID
            if let Some(member) = members.iter().find(|m| m.id == member_id) {
                Ok((StatusCode::OK, Json(member.clone())))
            } else {
                Err(ApiError::BadRequest(
                    "Member not found in organization or does not have org_admin role".to_string(),
                ))
            }
        }
        Err(e) => {
            tracing::error!("Failed to get organization member: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get organization member".to_string(),
            ))
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
    match app_state
        .keycloak_service
        .get_organization_members(&token, &org_id)
        .await
    {
        Ok(members) => {
            if !members.iter().any(|m| m.id == member_id) {
                return Err(ApiError::BadRequest(
                    "Member not found in organization".to_string(),
                ));
            }
        }
        Err(e) => {
            tracing::error!("Failed to get organization members: {}", e);
            return Err(ApiError::InternalServerError(
                "Failed to get organization members".to_string(),
            ));
        }
    }

    // Now get all organizations where this member belongs (same logic as get_member_organizations)
    match app_state.keycloak_service.get_organizations(&token).await {
        Ok(organizations) => {
            let mut member_organizations = Vec::new();

            // For each organization, check if the user is a member
            for org in organizations {
                match app_state
                    .keycloak_service
                    .get_organization_members(&token, &org.id)
                    .await
                {
                    Ok(members) => {
                        if members.iter().any(|member| member.id == member_id) {
                            member_organizations.push(org);
                        }
                    }
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
        }
        Err(e) => {
            tracing::error!("Failed to get member organizations: {}", e);
            Err(ApiError::InternalServerError(
                "Failed to get member organizations".to_string(),
            ))
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

    tracing::info!(
        "Attempting to remove member {} from organization {}",
        membership_id,
        org_id
    );

    // First, get the user's current roles to remove them
    let user_roles = match app_state
        .keycloak_service
        .get_user_realm_roles(&token, &membership_id)
        .await
    {
        Ok(roles) => roles,
        Err(e) => {
            tracing::warn!("Failed to get user roles for removal: {}", e);
            vec![] // Continue with removal even if we can't get roles
        }
    };

    // Remove the user from the organization
    match app_state
        .keycloak_service
        .remove_user_from_organization(&token, &org_id, &membership_id)
        .await
    {
        Ok(()) => {
            // Remove all realm roles from the user, except the default role
            for role_name in &user_roles {
                // Skip the default role that should be preserved
                if role_name == "default-roles-sustainability-realm" {
                    tracing::info!(
                        "Preserving default role '{}' for user {}",
                        role_name,
                        membership_id
                    );
                    continue;
                }

                if let Err(e) = app_state
                    .keycloak_service
                    .remove_realm_role_from_user(&token, &membership_id, role_name)
                    .await
                {
                    tracing::warn!(
                        "Failed to remove realm role '{}' from user {}: {}",
                        role_name,
                        membership_id,
                        e
                    );
                    // Continue removing other roles even if one fails
                }
            }

            // If the user had org_admin role, also remove the associated client roles
            if user_roles.contains(&"org_admin".to_string()) {
                let client_roles = vec![
                    "view-users",
                    "query-users",
                    "manage-users",
                    "manage-organizations",
                    "manage-clients",
                    "manage-realm",
                ];
                // Use the correct UUID for the realm-management client
                let client_id = "4c6be2d1-547f-4ecc-912d-facf2f52935a";

                for client_role in client_roles {
                    if let Err(e) = app_state
                        .keycloak_service
                        .remove_client_role_from_user(
                            &token,
                            &membership_id,
                            client_id,
                            client_role,
                        )
                        .await
                    {
                        tracing::warn!(
                            "Failed to remove client role '{}' from user {}: {}",
                            client_role,
                            membership_id,
                            e
                        );
                        // Continue removing other client roles even if one fails
                    }
                }
            }

            tracing::info!("Successfully removed member {} from organization {} and removed all associated roles", membership_id, org_id);
            Ok(StatusCode::NO_CONTENT)
        }
        Err(e) => {
            tracing::error!(
                "Failed to remove member {} from organization {}: {}",
                membership_id,
                org_id,
                e
            );
            Err(ApiError::InternalServerError(format!(
                "Failed to remove member from organization: {e}"
            )))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct OrgAdminMemberRequest {
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub roles: Vec<String>,
    pub categories: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct OrgAdminUserInvitationResponse {
    pub user_id: String,
    pub email: String,
    pub status: String,
    pub message: String,
}

/// Add a new member to an organization (Org Admin only)
pub async fn add_org_admin_member(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Path(org_id): Path<String>,
    Json(request): Json<OrgAdminMemberRequest>,
) -> Result<(StatusCode, Json<OrgAdminUserInvitationResponse>), ApiError> {
    // Check if user has org admin permissions for this organization
    if !claims.is_org_admin() {
        return Err(ApiError::BadRequest(
            "Insufficient permissions for this organization".to_string(),
        ));
    }

    // Validate email format
    if !request.email.contains('@') || !request.email.contains('.') {
        return Err(ApiError::BadRequest("Invalid email format".to_string()));
    }

    // Validate required fields
    if request.email.trim().is_empty()
        || request
            .first_name
            .as_ref()
            .is_none_or(|name| name.trim().is_empty())
        || request
            .last_name
            .as_ref()
            .is_none_or(|name| name.trim().is_empty())
    {
        return Err(ApiError::BadRequest(
            "Email, first name, and last name are required".to_string(),
        ));
    }

    // Validate roles
    if request.roles.is_empty() {
        return Err(ApiError::BadRequest(
            "At least one role must be assigned".to_string(),
        ));
    }

    // Generate username from email
    let username = request
        .email
        .split('@')
        .next()
        .unwrap_or(&request.email)
        .to_string();

    // Create user request for Keycloak
    let create_user_request = crate::common::models::keycloak::CreateUserRequest {
        username: username.clone(),
        email: request.email.clone(),
        first_name: request.first_name.clone(),
        last_name: request.last_name.clone(),
        email_verified: Some(false),
        enabled: Some(true),
        attributes: Some(serde_json::json!({
            "organization_id": org_id,
            "pending_roles": request.roles,
            "pending_categories": request.categories,
            "invitation_status": "pending_email_verification"
        })),
        credentials: None,
        required_actions: Some(vec!["VERIFY_EMAIL".to_string()]),
    };

    match app_state
        .keycloak_service
        .create_user_with_email_verification(&token, &create_user_request)
        .await
    {
        Ok(user) => {
            let user_id = user.id.clone();
            let user_email = user.email.clone();

            // Send organization invitation immediately (regardless of email verification)
            match app_state
                .keycloak_service
                .send_organization_invitation_immediate(
                    &token,
                    &org_id,
                    &user_id,
                    request.roles.clone(),
                )
                .await
            {
                Ok(_invitation) => {
                    tracing::info!(user_id = %user_id, org_id = %org_id, "Organization invitation sent immediately");

                    let response = OrgAdminUserInvitationResponse {
                        user_id: user.id,
                        email: user.email,
                        status: "active".to_string(),
                        message: "User created successfully and organization invitation sent. User can now access the system.".to_string(),
                    };

                    tracing::info!(user_id = %user_id, email = %user_email, "Org admin user invitation created successfully with immediate organization invitation");
                    Ok((StatusCode::CREATED, Json(response)))
                }
                Err(e) => {
                    tracing::warn!(user_id = %user_id, org_id = %org_id, error = %e, "Failed to send organization invitation immediately, but user was created");

                    let response = OrgAdminUserInvitationResponse {
                        user_id: user.id,
                        email: user.email,
                        status: "pending_org_invitation".to_string(),
                        message: "User created successfully and email verification sent. Organization invitation failed and will need to be sent manually.".to_string(),
                    };

                    Ok((StatusCode::CREATED, Json(response)))
                }
            }
        }
        Err(e) => {
            let error_message = e.to_string();
            tracing::error!(email = %request.email, error = %error_message, "Failed to create user for org admin invitation");

            // Provide specific error messages based on the error type
            if error_message.contains("already exists")
                || error_message.contains("duplicate")
                || error_message.contains("User exists with same email")
                || (error_message.contains("errorMessage")
                    && error_message.contains("User exists with same email"))
            {
                Err(ApiError::Conflict(
                    "A user with this email address already exists in the system".to_string(),
                ))
            } else if error_message.contains("email") && error_message.contains("invalid") {
                Err(ApiError::BadRequest("Invalid email format".to_string()))
            } else if error_message.contains("organization") && error_message.contains("not found")
            {
                Err(ApiError::NotFound("Organization not found".to_string()))
            } else if error_message.contains("permission") || error_message.contains("access") {
                Err(ApiError::Forbidden(
                    "You don't have permission to create users in this organization".to_string(),
                ))
            } else if error_message.contains("email service") || error_message.contains("mail") {
                Err(ApiError::InternalServerError("Email service is temporarily unavailable. The user was created but verification email could not be sent".to_string()))
            } else if error_message.contains("network") || error_message.contains("connection") {
                Err(ApiError::InternalServerError(
                    "Service temporarily unavailable. Please try again later".to_string(),
                ))
            } else {
                Err(ApiError::InternalServerError(
                    "Failed to create user. Please try again later".to_string(),
                ))
            }
        }
    }
}

// GET /api/organizations/:org_id/org-admin/members
pub async fn get_org_admin_members(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path(org_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let token = get_token_from_extensions(&token)?;
    if !claims.is_organization_admin()
        || (!claims.is_application_admin() && !is_member_of_org_by_id(&claims, &org_id))
    {
        tracing::error!(?claims, org_id = %org_id, "Permission denied: not org_admin or not member of org");
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }
    // Get only Org_User members (org admins should only see regular users, not other admins)
    let members = app_state
        .keycloak_service
        .get_organization_members_by_role(&token, &org_id, "Org_User")
        .await
        .map_err(|e| {
            tracing::error!("Failed to get org members: {}", e);
            ApiError::InternalServerError("Failed to get org members".to_string())
        })?;
    // For each member, fetch categories from user attributes
    let mut members_with_categories = Vec::new();
    for member in members {
        let categories = app_state
            .keycloak_service
            .get_user_categories_by_id(&token, &member.id)
            .await
            .unwrap_or_default();
        let mut member_json = serde_json::to_value(&member).unwrap_or_default();
        member_json["categories"] = serde_json::json!(categories);
        members_with_categories.push(member_json);
    }
    Ok((StatusCode::OK, Json(members_with_categories)))
}

// DELETE /api/organizations/:org_id/org-admin/members/:member_id
pub async fn remove_org_admin_member(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((org_id, member_id)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;
    if !claims.is_organization_admin()
        || (!claims.is_application_admin() && !is_member_of_org_by_id(&claims, &org_id))
    {
        tracing::error!(?claims, org_id = %org_id, member_id = %member_id, "Permission denied: not org_admin or not member of org");
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // First, get the user's current roles to remove them
    let user_roles = match app_state
        .keycloak_service
        .get_user_realm_roles(&token, &member_id)
        .await
    {
        Ok(roles) => roles,
        Err(e) => {
            tracing::warn!("Failed to get user roles for removal: {}", e);
            vec![] // Continue with removal even if we can't get roles
        }
    };

    // Remove the user from the organization
    app_state
        .keycloak_service
        .remove_user_from_organization(&token, &org_id, &member_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to remove org user: {}", e);
            ApiError::InternalServerError("Failed to remove org user".to_string())
        })?;

    // Remove all realm roles from the user, except the default role
    for role_name in &user_roles {
        // Skip the default role that should be preserved
        if role_name == "default-roles-sustainability-realm" {
            tracing::info!(
                "Preserving default role '{}' for user {}",
                role_name,
                member_id
            );
            continue;
        }

        if let Err(e) = app_state
            .keycloak_service
            .remove_realm_role_from_user(&token, &member_id, role_name)
            .await
        {
            tracing::warn!(
                "Failed to remove realm role '{}' from user {}: {}",
                role_name,
                member_id,
                e
            );
            // Continue removing other roles even if one fails
        }
    }

    // If the user had org_admin role, also remove the associated client roles
    if user_roles.contains(&"org_admin".to_string()) {
        let client_roles = vec![
            "view-users",
            "query-users",
            "manage-users",
            "manage-organizations",
            "manage-clients",
            "manage-realm",
        ];
        // Use the correct UUID for the realm-management client
        let client_id = "4c6be2d1-547f-4ecc-912d-facf2f52935a";

        for client_role in client_roles {
            if let Err(e) = app_state
                .keycloak_service
                .remove_client_role_from_user(&token, &member_id, client_id, client_role)
                .await
            {
                tracing::warn!(
                    "Failed to remove client role '{}' from user {}: {}",
                    client_role,
                    member_id,
                    e
                );
                // Continue removing other client roles even if one fails
            }
        }
    }

    tracing::info!(
        "Successfully removed user {} from organization {} and removed all associated roles",
        member_id,
        org_id
    );
    Ok(StatusCode::NO_CONTENT)
}

#[derive(serde::Deserialize)]
pub struct OrgAdminMemberCategoryUpdateRequest {
    pub categories: Vec<String>,
}

// PUT /api/organizations/:org_id/org-admin/members/:member_id/categories
pub async fn update_org_admin_member_categories(
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    State(app_state): State<AppState>,
    Path((org_id, member_id)): Path<(String, String)>,
    Json(request): Json<OrgAdminMemberCategoryUpdateRequest>,
) -> Result<StatusCode, ApiError> {
    let token = get_token_from_extensions(&token)?;
    if !claims.is_organization_admin()
        || (!claims.is_application_admin() && !is_member_of_org_by_id(&claims, &org_id))
    {
        tracing::error!(?claims, org_id = %org_id, member_id = %member_id, "Permission denied: not org_admin or not member of org");
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }
    app_state
        .keycloak_service
        .set_user_categories_by_id(&token, &member_id, &request.categories)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update user categories: {}", e);
            ApiError::InternalServerError("Failed to update user categories".to_string())
        })?;
    Ok(StatusCode::NO_CONTENT)
}
