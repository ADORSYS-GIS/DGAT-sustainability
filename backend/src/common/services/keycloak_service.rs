use crate::common::config::KeycloakConfigs;
use crate::common::models::keycloak::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde_json::json;
use std::sync::Arc;
use tracing::{debug, error, info, warn};
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct KeycloakService {
    client: Client,
    config: KeycloakConfigs,
}

impl KeycloakService {
    pub fn new(config: KeycloakConfigs) -> Self {
        let client = Client::builder()
            .danger_accept_invalid_certs(true)
            .build().expect("Failed to create reqwest client");

        Self { client, config }
    }

    /// Create a new organization
    pub async fn create_organization(&self,
                                     admin_token: &str,
                                     name: &str,
                                     domains: Vec<crate::web::api::models::OrganizationDomainRequest>,
                                     redirect_url: String,
                                     enabled: String,
                                     attributes: Option<std::collections::HashMap<String, Vec<String>>>
    ) -> Result<KeycloakOrganization> {
        let url = format!("{}/admin/realms/{}/organizations", self.config.url, self.config.realm);

        let mut payload = json!({
            "name": name,
            "domains": domains,
            "redirectUrl": redirect_url,
            "enabled": enabled == "true",
        });
        if let Some(attrs) = &attributes {
            payload["attributes"] = json!(attrs);
        }
        info!(payload = %payload, "Sending organization create payload to Keycloak");

        let response = self.client.post(&url)
            .bearer_auth(admin_token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::CREATED | StatusCode::NO_CONTENT => {
                let text = response.text().await?;
                tracing::warn!("Create organization response: {}", text);
                if !text.trim().is_empty() {
                    let org: KeycloakOrganization = serde_json::from_str(&text)?;
                    tracing::warn!("Created organization: {:?}", org);
                    Ok(org)
                } else {
                    // If no body, return a minimal KeycloakOrganization with only the name and domains
                    let created_org = KeycloakOrganization {
                        id: String::new(),
                        name: name.to_string(),
                        alias: None,
                        enabled: enabled == "true",
                        description: None,
                        redirect_url: Some(redirect_url),
                        domains: Some(domains.into_iter().map(|d| OrganizationDomain { name: d.name, verified: None }).collect()),
                        attributes: attributes.map(|attrs| serde_json::to_value(attrs).unwrap_or_default()),
                    };
                    tracing::warn!("Created organization (no response body): {:?}", created_org);
                    Ok(created_org)
                }
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to create organization: {}", error_text);
                Err(anyhow!("Failed to create organization: {}", error_text))
            }
        }
    }

    /// Get all organizations
    pub async fn get_organizations(&self, token: &str) -> Result<Vec<KeycloakOrganization>> {
        let url = format!("{}/admin/realms/{}/organizations?briefRepresentation=false", self.config.url, self.config.realm);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let response_text = response.text().await?;
        tracing::warn!("Raw Keycloak response: {}", response_text);
        
        let orgs: Vec<KeycloakOrganization> = serde_json::from_str(&response_text)?;
        tracing::warn!("Deserialized organizations: {:?}", orgs);
        Ok(orgs)
    }

    /// Get a specific organization by ID
    pub async fn get_organization(&self, token: &str, org_id: &str) -> Result<KeycloakOrganization> {
        let url = format!("{}/admin/realms/{}/organizations/{}?briefRepresentation=false", self.config.url, self.config.realm, org_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let response_text = response.text().await?;
        tracing::warn!("Raw single organization response: {}", response_text);
        
        let org: KeycloakOrganization = serde_json::from_str(&response_text)?;
        tracing::warn!("Deserialized single organization: {:?}", org);
        Ok(org)
    }

    /// Update an organization
    pub async fn update_organization(&self,
                                     token: &str,
                                     org_id: &str,
                                     name: &str,
                                     domains: Vec<crate::web::api::models::OrganizationDomainRequest>,
                                     attributes: Option<std::collections::HashMap<String, Vec<String>>>
    ) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}", self.config.url, self.config.realm, org_id);

        let mut payload = json!({
            "name": name,
            "domains": domains,
        });

        if let Some(attrs) = attributes {
            payload["attributes"] = json!(attrs);
        }

        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to update organization: {}", error_text);
                Err(anyhow!("Failed to update organization: {}", error_text))
            }
        }
    }

    /// Delete an organization
    pub async fn delete_organization(&self, token: &str, org_id: &str) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}", self.config.url, self.config.realm, org_id);

        let response = self.client.delete(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to delete organization: {}", error_text);
                Err(anyhow!("Failed to delete organization: {}", error_text))
            }
        }
    }

    /// Get organization members
    pub async fn get_organization_members(&self, token: &str, org_id: &str) -> Result<Vec<KeycloakOrganizationMember>> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members", self.config.url, self.config.realm, org_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let members: Vec<KeycloakOrganizationMember> = response.json().await?;
        Ok(members)
    }

    /// Find a user by username or email
    pub async fn find_user_by_username_or_email(&self, token: &str, query: &str) -> Result<Option<KeycloakUser>> {
        let url = format!("{}/admin/realms/{}/users?search={}", self.config.url, self.config.realm, query);
        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;
        let users: Vec<KeycloakUser> = response.json().await?;
        // Try to find an exact match by username or email
        let user = users.into_iter().find(|u| u.username == query || u.email == query);
        Ok(user)
    }

    /// Assign a realm role to a user by role name
    pub async fn assign_realm_role_to_user(&self, token: &str, user_id: &str, role_name: &str) -> Result<()> {
        // Get the role object by name
        let url = format!("{}/admin/realms/{}/roles/{}", self.config.url, self.config.realm, role_name);
        let role: serde_json::Value = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        // Assign the role to the user
        let assign_url = format!("{}/admin/realms/{}/users/{}/role-mappings/realm", self.config.url, self.config.realm, user_id);
        let roles_payload = serde_json::json!([role]);
        let response = self.client.post(&assign_url)
            .bearer_auth(token)
            .json(&roles_payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK | StatusCode::CREATED => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to assign realm role to user: {}", error_text);
                Err(anyhow!("Failed to assign realm role to user: {}", error_text))
            }
        }
    }

    /// Remove a realm role from a user by role name
    pub async fn remove_realm_role_from_user(&self, token: &str, user_id: &str, role_name: &str) -> Result<()> {
        // Get the role object by name
        let url = format!("{}/admin/realms/{}/roles/{}", self.config.url, self.config.realm, role_name);
        let role: serde_json::Value = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        // Remove the role from the user
        let remove_url = format!("{}/admin/realms/{}/users/{}/role-mappings/realm", self.config.url, self.config.realm, user_id);
        let roles_payload = serde_json::json!([role]);
        let response = self.client.delete(&remove_url)
            .bearer_auth(token)
            .json(&roles_payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK => {
                info!("Successfully removed realm role '{}' from user {}", role_name, user_id);
                Ok(())
            },
            StatusCode::NOT_FOUND => {
                // Role doesn't exist or was already removed - consider this a success (idempotent)
                info!("Realm role '{}' was not found for user {} (may have been already removed)", role_name, user_id);
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to remove realm role from user: {}", error_text);
                Err(anyhow!("Failed to remove realm role from user: {}", error_text))
            }
        }
    }

    /// Assign a client role to a user by role name
    pub async fn assign_client_role_to_user(&self, token: &str, user_id: &str, client_id: &str, role_name: &str) -> Result<()> {
        // Get the client role object by name
        let url = format!("{}/admin/realms/{}/clients/{}/roles/{}", self.config.url, self.config.realm, client_id, role_name);
        let role: serde_json::Value = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        // Assign the client role to the user
        let assign_url = format!("{}/admin/realms/{}/users/{}/role-mappings/clients/{}", self.config.url, self.config.realm, user_id, client_id);
        let roles_payload = json!([role]);
        let response = self.client.post(&assign_url)
            .bearer_auth(token)
            .json(&roles_payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK | StatusCode::CREATED => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to assign client role to user: {}", error_text);
                Err(anyhow!("Failed to assign client role to user: {}", error_text))
            }
        }
    }

    /// Remove a client role from a user by role name
    pub async fn remove_client_role_from_user(&self, token: &str, user_id: &str, client_id: &str, role_name: &str) -> Result<()> {
        // Get the client role object by name
        let url = format!("{}/admin/realms/{}/clients/{}/roles/{}", self.config.url, self.config.realm, client_id, role_name);
        let role: serde_json::Value = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        // Remove the client role from the user
        let remove_url = format!("{}/admin/realms/{}/users/{}/role-mappings/clients/{}", self.config.url, self.config.realm, user_id, client_id);
        let roles_payload = json!([role]);
        let response = self.client.delete(&remove_url)
            .bearer_auth(token)
            .json(&roles_payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK => {
                info!("Successfully removed client role '{}' from user {}", role_name, user_id);
                Ok(())
            },
            StatusCode::NOT_FOUND => {
                // Role doesn't exist or was already removed - consider this a success (idempotent)
                info!("Client role '{}' was not found for user {} (may have been already removed)", role_name, user_id);
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to remove client role from user: {}", error_text);
                Err(anyhow!("Failed to remove client role from user: {}", error_text))
            }
        }
    }

    /// Add user to organization
    pub async fn add_user_to_organization(&self, token: &str, org_id: &str, email: &str, roles: Vec<String>) -> Result<()> {
        // Always look up the user by email
        let user = match self.find_user_by_username_or_email(token, email).await? {
            Some(user) => user,
            None => return Err(anyhow!("User not found in Keycloak by email: {}", email)),
        };
        let user_uuid = user.id;
        // Assign the first role in the roles array (default: org_admin)
        if let Some(role_name) = roles.get(0) {
            self.assign_realm_role_to_user(token, &user_uuid, role_name).await?;
            // If the user is an org_admin, automatically assign client roles for realm-management
            if role_name == "org_admin" {
                // Define the client roles that org_admin users should have
                let client_roles = vec![
                    "view-users",
                    "query-users",
                    "manage-users",
                    "manage-organizations",
                    "manage-clients",
                    "manage-realm"
                ];
                // Use the correct UUID for the realm-management client
                let client_id = "4c6be2d1-547f-4ecc-912d-facf2f52935a";
                for client_role in client_roles {
                    match self.assign_client_role_to_user(token, &user_uuid, client_id, client_role).await {
                        Ok(_) => info!("Successfully assigned client role '{}' to user {}", client_role, email),
                        Err(e) => {
                            // Log the error but don't fail the entire operation
                            error!("Failed to assign client role '{}' to user {}: {}", client_role, email, e);
                        }
                    }
                }
            }
        }
        let url = format!("{}/admin/realms/{}/organizations/{}/members", self.config.url, self.config.realm, org_id);
        let payload = user_uuid;
        info!(url = %url, payload = %payload, "Sending add user to organization request to Keycloak");
        let response = self.client.post(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::CREATED | StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to add user to organization: {}", error_text);
                Err(anyhow!("Failed to add user to organization: {}", error_text))
            }
        }
    }

    /// Remove user from organization
    pub async fn remove_user_from_organization(&self, token: &str, org_id: &str, membership_id: &str) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members/{}",
                          self.config.url, self.config.realm, org_id, membership_id);

        let response = self.client.delete(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => {
                info!("Successfully removed user {} from organization {}", membership_id, org_id);
                Ok(())
            },
            StatusCode::NOT_FOUND => {
                // Member doesn't exist or was already removed - consider this a success (idempotent)
                info!("User {} was not found in organization {} (may have been already removed)", membership_id, org_id);
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to remove user from organization: {}", error_text);
                Err(anyhow!("Failed to remove user from organization: {}", error_text))
            }
        }
    }

    /// Update user roles in organization
    pub async fn update_user_roles(&self, token: &str, org_id: &str, membership_id: &str, roles: Vec<String>) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members/{}",
                          self.config.url, self.config.realm, org_id, membership_id);

        let payload = json!({
            "roles": roles
        });

        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to update user roles: {}", error_text);
                Err(anyhow!("Failed to update user roles: {}", error_text))
            }
        }
    }

    /// Create an invitation to an organization
    pub async fn create_invitation(&self, token: &str, org_id: &str, email: &str, roles: Vec<String>, expiration: Option<String>) -> Result<KeycloakInvitation> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members/invite-user",
                          self.config.url, self.config.realm, org_id);

        // Build form data (not JSON)
        let mut form_data = std::collections::HashMap::new();
        form_data.insert("email".to_string(), email.to_string());
        
        // Add roles if provided (might need to be comma-separated or handled differently)
        if !roles.is_empty() {
            let roles_str = roles.join(",");
            form_data.insert("roles".to_string(), roles_str);
        }

        info!(url = %url, email = %email, org_id = %org_id, "Creating organization invitation with form data");

        let response = self.client.post(&url)
            .bearer_auth(token)
            .form(&form_data)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => {
                // Since the API returns 204 No Content, we create a mock invitation response
                let invitation = KeycloakInvitation {
                    id: format!("invitation-{}", chrono::Utc::now().timestamp()),
                    email: email.to_string(),
                    invited_at: chrono::Utc::now().to_rfc3339(),
                    expiration,
                    roles,
                };
                info!(invitation_id = %invitation.id, email = %email, "Organization invitation created successfully");
                Ok(invitation)
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to create invitation: {}", error_text);
                Err(anyhow!("Failed to create invitation: {}", error_text))
            }
        }
    }

    /// Get all invitations for an organization
    pub async fn get_invitations(&self, token: &str, org_id: &str) -> Result<Vec<KeycloakInvitation>> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members/invitations",
                          self.config.url, self.config.realm, org_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let invitations: Vec<KeycloakInvitation> = response.json().await?;
        Ok(invitations)
    }

    /// Delete an invitation
    pub async fn delete_invitation(&self, token: &str, org_id: &str, invitation_id: &str) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}/members/invitations/{}",
                          self.config.url, self.config.realm, org_id, invitation_id);

        let response = self.client.delete(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to delete invitation: {}", error_text);
                Err(anyhow!("Failed to delete invitation: {}", error_text))
            }
        }
    }

    pub async fn set_user_categories_by_email(&self, token: &str, email: &str, categories: &Vec<String>) -> Result<()> {
        let user = self.find_user_by_username_or_email(token, email).await?.ok_or_else(|| anyhow!("User not found by email: {}", email))?;
        let user_id = user.id;
        let user_email = user.email.clone();
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        let payload = json!({
            "email": user_email,
            "attributes": { "categories": categories }
        });
        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;
        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to set user categories: {}", error_text);
                Err(anyhow!("Failed to set user categories: {}", error_text))
            }
        }
    }
    /// Get user categories by user ID
    pub async fn get_user_categories_by_id(&self, token: &str, user_id: &str) -> Result<Vec<String>> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        
        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::OK => {
            let user: serde_json::Value = response.json().await?;
                let attributes = user.get("attributes").and_then(|a| a.as_object());
                
                if let Some(attrs) = attributes {
                    if let Some(categories) = attrs.get("categories") {
                        if let Some(categories_array) = categories.as_array() {
                            let categories: Vec<String> = categories_array
                                .iter()
                                .filter_map(|c| c.as_str().map(|s| s.to_string()))
                                .collect();
                            return Ok(categories);
                        }
                    }
                }
                Ok(Vec::new())
            },
            _ => {
            let error_text = response.text().await?;
            error!("Failed to get user categories: {}", error_text);
            Err(anyhow!("Failed to get user categories: {}", error_text))
        }
    }
    }

    /// Create a new user with email verification required
    pub async fn create_user_with_email_verification(&self, token: &str, request: &CreateUserRequest) -> Result<KeycloakUser> {
        let url = format!("{}/admin/realms/{}/users", self.config.url, self.config.realm);
        
        // Generate a temporary password
        let temp_password = self.generate_temporary_password();
        
        let mut payload = json!({
            "username": request.username,
            "email": request.email,
            "enabled": true,
            "emailVerified": false,
            "requiredActions": ["VERIFY_EMAIL"],
            "credentials": [{
                "type": "password",
                "value": temp_password,
                "temporary": true
            }]
        });

        // Add optional fields if provided
        if let Some(first_name) = &request.first_name {
            payload["firstName"] = json!(first_name);
        }
        if let Some(last_name) = &request.last_name {
            payload["lastName"] = json!(last_name);
        }
        if let Some(attributes) = &request.attributes {
            payload["attributes"] = json!(attributes);
        }

        info!(url = %url, email = %request.email, "Creating user with email verification");

        let response = self.client.post(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::CREATED => {
                // Get the created user to return the full user object
                let location = response.headers()
                    .get("location")
                    .and_then(|h| h.to_str().ok())
                    .ok_or_else(|| anyhow!("No location header in response"))?;
                
                let user_id = location.split('/').last()
                    .ok_or_else(|| anyhow!("Invalid location header"))?;
                
                // Fetch the created user
                let user = self.get_user_by_id(token, user_id).await?;
                
                // Trigger email verification email
                self.trigger_email_verification(token, user_id).await?;
                
                // Note: Organization invitation is now handled in the admin handler
                // after user creation, not in this function
                
                info!(user_id = %user_id, email = %request.email, "User created successfully with email verification required");
                Ok(user)
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to create user: {}", error_text);
                Err(anyhow!("Failed to create user: {}", error_text))
            }
        }
    }

    /// Get user by ID
    pub async fn get_user_by_id(&self, token: &str, user_id: &str) -> Result<KeycloakUser> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        
        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::OK => {
                let user: KeycloakUser = response.json().await?;
                Ok(user)
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to get user by ID: {}", error_text);
                Err(anyhow!("Failed to get user by ID: {}", error_text))
            }
        }
    }

    /// Check if user's email is verified
    pub async fn is_user_email_verified(&self, token: &str, user_id: &str) -> Result<bool> {
        let user = self.get_user_by_id(token, user_id).await?;
        Ok(user.email_verified)
    }

    /// Send organization invitation immediately (regardless of email verification)
    pub async fn send_organization_invitation_immediate(&self, token: &str, org_id: &str, user_id: &str, roles: Vec<String>) -> Result<KeycloakInvitation> {
        // First, get the user to get their email
        let user = self.get_user_by_id(token, user_id).await?;
        
        info!(user_id = %user_id, user_email = %user.email, org_id = %org_id, roles = ?roles, "Preparing to send organization invitation");
        
        // Check if user email is empty
        if user.email.is_empty() {
            return Err(anyhow!("User email is empty, cannot send organization invitation"));
        }
        
        // Assign realm roles and client roles (same logic as add_user_to_organization)
        if let Some(role_name) = roles.get(0) {
            info!(user_id = %user_id, role = %role_name, "Assigning realm role to user");
            self.assign_realm_role_to_user(token, user_id, role_name).await?;
            
            // If the user is an org_admin, automatically assign client roles for realm-management
            if role_name == "org_admin" {
                info!(user_id = %user_id, "User is org_admin, assigning client roles");
                // Define the client roles that org_admin users should have
                let client_roles = vec![
                    "view-users",
                    "query-users",
                    "manage-users",
                    "manage-organizations",
                    "manage-clients",
                    "manage-realm"
                ];
                // Use the correct UUID for the realm-management client
                let client_id = "4c6be2d1-547f-4ecc-912d-facf2f52935a";
                for client_role in client_roles {
                    match self.assign_client_role_to_user(token, user_id, client_id, client_role).await {
                        Ok(_) => info!(user_id = %user_id, client_role = %client_role, "Successfully assigned client role"),
                        Err(e) => {
                            // Log the error but don't fail the entire operation
                            warn!(user_id = %user_id, client_role = %client_role, error = %e, "Failed to assign client role");
                        }
                    }
                }
            }
        }
        
        // Create the organization invitation (no email verification check)
        let invitation = self.create_invitation(token, org_id, &user.email, roles.clone(), None).await?;
        
        info!(user_id = %user_id, email = %user.email, org_id = %org_id, "Organization invitation sent immediately with role assignments (email verification not required)");
        Ok(invitation)
    }

    /// Send organization invitation after email verification
    pub async fn send_organization_invitation(&self, token: &str, org_id: &str, user_id: &str, roles: Vec<String>) -> Result<KeycloakInvitation> {
        // First, get the user to get their email
        let user = self.get_user_by_id(token, user_id).await?;
        
        // Check if email is verified
        if !user.email_verified {
            return Err(anyhow!("Cannot send organization invitation: user email not verified"));
        }

        // Create the organization invitation
        let invitation = self.create_invitation(token, org_id, &user.email, roles, None).await?;
        
        info!(user_id = %user_id, email = %user.email, org_id = %org_id, "Organization invitation sent successfully");
        Ok(invitation)
    }

    /// Generate a temporary password for new users
    fn generate_temporary_password(&self) -> String {
        use rand::{thread_rng, Rng};
        use rand::distributions::Alphanumeric;
        
        let mut rng = thread_rng();
        let password: String = (0..12)
            .map(|_| rng.sample(Alphanumeric) as char)
            .collect();
        
        format!("Temp{}!", password)
    }

    /// Trigger email verification email for a user
    pub async fn trigger_email_verification(&self, token: &str, user_id: &str) -> Result<()> {
        // Method 1: Try the send-verify-email endpoint
        let url = format!("{}/admin/realms/{}/users/{}/send-verify-email", 
                         self.config.url, self.config.realm, user_id);
        
        let response = self.client.post(&url)
            .bearer_auth(token)
            .send()
            .await;

        match response {
            Ok(response) => {
                match response.status() {
                    StatusCode::NO_CONTENT | StatusCode::OK => {
                        info!(user_id = %user_id, "Email verification email triggered successfully via send-verify-email");
                        return Ok(());
                    },
                    _ => {
                        let error_text = response.text().await?;
                        debug!("send-verify-email failed: {}", error_text);
                        // Continue to method 2
                    }
                }
            },
            Err(e) => {
                debug!("send-verify-email request failed: {}", e);
                // Continue to method 2
            }
        }

        // Method 2: Try executing the VERIFY_EMAIL action
        let url = format!("{}/admin/realms/{}/users/{}/execute-actions-email", 
                         self.config.url, self.config.realm, user_id);
        
        let payload = json!(["VERIFY_EMAIL"]);
        
        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT | StatusCode::OK => {
                info!(user_id = %user_id, "Email verification email triggered successfully via execute-actions-email");
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to trigger email verification via execute-actions-email: {}", error_text);
                Err(anyhow!("Failed to trigger email verification: {}", error_text))
            }
        }
    }

    /// Handle email verification event (called by webhook)
    pub async fn handle_email_verification_event(&self, token: &str, user_id: &str, org_id: &str, roles: Vec<String>, categories: Vec<String>) -> Result<()> {
        // Verify that the user's email is actually verified
        let is_verified = self.is_user_email_verified(token, user_id).await?;
        
        if !is_verified {
            return Err(anyhow!("User email is not verified"));
        }

        // Set user categories
        self.set_user_categories_by_id(token, user_id, &categories).await?;

        // Send organization invitation
        self.send_organization_invitation(token, org_id, user_id, roles).await?;

        info!(user_id = %user_id, org_id = %org_id, "Email verification handled successfully, organization invitation sent");
        Ok(())
    }

    /// Set user categories by user ID
    pub async fn set_user_categories_by_id(&self, token: &str, user_id: &str, categories: &[String]) -> Result<()> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        
        let payload = json!({
            "attributes": {
                "categories": categories
            }
        });

        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => {
                info!(user_id = %user_id, categories = ?categories, "User categories set successfully");
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to set user categories: {}", error_text);
                Err(anyhow!("Failed to set user categories: {}", error_text))
            }
        }
    }

    /// Update user attributes
    pub async fn update_user_attributes(&self, token: &str, user_id: &str, request: &CreateUserRequest) -> Result<()> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        
        let mut payload = json!({});

        // Add fields that should be updated
        if let Some(first_name) = &request.first_name {
            payload["firstName"] = json!(first_name);
        }
        if let Some(last_name) = &request.last_name {
            payload["lastName"] = json!(last_name);
        }
        if let Some(email_verified) = request.email_verified {
            payload["emailVerified"] = json!(email_verified);
        }
        if let Some(enabled) = request.enabled {
            payload["enabled"] = json!(enabled);
        }
        if let Some(attributes) = &request.attributes {
            payload["attributes"] = json!(attributes);
        }
        if let Some(required_actions) = &request.required_actions {
            payload["requiredActions"] = json!(required_actions);
        }

        let response = self.client.put(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => {
                info!(user_id = %user_id, "User attributes updated successfully");
                Ok(())
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to update user attributes: {}", error_text);
                Err(anyhow!("Failed to update user attributes: {}", error_text))
            }
        }
    }

    /// Get user realm roles by user ID
    pub async fn get_user_realm_roles(&self, token: &str, user_id: &str) -> Result<Vec<String>> {
        let url = format!("{}/admin/realms/{}/users/{}/role-mappings/realm", self.config.url, self.config.realm, user_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::OK => {
                let roles: Vec<serde_json::Value> = response.json().await?;
                let role_names: Vec<String> = roles.into_iter()
                    .filter_map(|role| role.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()))
                    .collect();
                Ok(role_names)
            },
            StatusCode::NOT_FOUND => {
                // User has no realm roles assigned
                Ok(vec![])
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to get user realm roles: {}", error_text);
                Err(anyhow!("Failed to get user realm roles: {}", error_text))
            }
        }
    }

    /// Get organization members filtered by realm role
    pub async fn get_organization_members_by_role(&self, token: &str, org_id: &str, role_name: &str) -> Result<Vec<KeycloakOrganizationMember>> {
        // First get all organization members
        let all_members = self.get_organization_members(token, org_id).await?;
        
        // Filter members who have the specified realm role
        let mut filtered_members = Vec::new();

        for member in all_members {
            match self.get_user_realm_roles(token, &member.id).await {
                Ok(roles) => {
                    if roles.contains(&role_name.to_string()) {
                        filtered_members.push(member);
                    }
                },
                Err(e) => {
                    // Log error but continue processing other members
                    error!("Failed to get roles for user {}: {}", member.id, e);
                }
            }
        }

        Ok(filtered_members)
    }
}

