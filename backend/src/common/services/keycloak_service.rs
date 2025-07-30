use crate::common::config::KeycloakConfigs;
use crate::common::models::keycloak::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde_json::json;
use std::sync::Arc;
use tracing::{debug, error, info};
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

    /// Get admin token for interacting with Keycloak admin APIs
    async fn get_admin_token(&self, username: &str, password: &str) -> Result<KeycloakToken> {
        let token_url = format!("{}/realms/master/protocol/openid-connect/token", self.config.url);

        let form = [
            ("client_id", "admin-cli"),
            ("grant_type", "password"),
            ("username", username),
            ("password", password),
        ];

        let response = self.client.post(&token_url)
            .form(&form)
            .send()
            .await?
            .error_for_status()?;

        let token: KeycloakToken = response.json().await?;
        Ok(token)
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
        if let Some(attrs) = attributes {
            payload["attributes"] = json!(attrs);
        }
        tracing::info!(payload = %payload, "Sending organization create payload to Keycloak");

        let response = self.client.post(&url)
            .bearer_auth(admin_token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::CREATED | StatusCode::NO_CONTENT => {
                let text = response.text().await?;
                if !text.trim().is_empty() {
                    let org: KeycloakOrganization = serde_json::from_str(&text)?;
                    Ok(org)
                } else {
                    // If no body, return a minimal KeycloakOrganization with only the name and domains
                    Ok(KeycloakOrganization {
                        id: String::new(),
                        name: name.to_string(),
                        alias: None,
                        enabled: enabled == "true",
                        description: None,
                        redirect_url: Some(redirect_url),
                        domains: Some(domains.into_iter().map(|d| OrganizationDomain { name: d.name, verified: None }).collect()),
                    })
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
        let url = format!("{}/admin/realms/{}/organizations", self.config.url, self.config.realm);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let orgs: Vec<KeycloakOrganization> = response.json().await?;
        Ok(orgs)
    }

    /// Get a specific organization by ID
    pub async fn get_organization(&self, token: &str, org_id: &str) -> Result<KeycloakOrganization> {
        let url = format!("{}/admin/realms/{}/organizations/{}", self.config.url, self.config.realm, org_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let org: KeycloakOrganization = response.json().await?;
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
        let user = users.into_iter().find(|u| u.username == query || u.email.as_deref() == Some(query));
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
                error!("Failed to assign client role to user: {}", error_text);
                Err(anyhow!("Failed to assign client role to user: {}", error_text))
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
        let url = format!("{}/admin/realms/{}/organizations/{}/invitations",
                          self.config.url, self.config.realm, org_id);

        let mut payload = json!({
            "email": email,
            "roles": roles
        });

        if let Some(exp) = expiration {
            payload["expiration"] = json!(exp);
        }

        let response = self.client.post(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::CREATED => {
                let invitation: KeycloakInvitation = response.json().await?;
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
        let url = format!("{}/admin/realms/{}/organizations/{}/invitations",
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
        let url = format!("{}/admin/realms/{}/organizations/{}/invitations/{}",
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
        let user_email = user.email.clone().unwrap_or_default();
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        let payload = serde_json::json!({
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
    pub async fn get_user_categories_by_id(&self, token: &str, user_id: &str) -> Result<Vec<String>> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?;
        if response.status().is_success() {
            let user: serde_json::Value = response.json().await?;
            if let Some(attrs) = user.get("attributes").and_then(|a| a.get("categories")) {
                if let Some(arr) = attrs.as_array() {
                    return Ok(arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect());
                }
            }
            Ok(vec![])
        } else {
            let error_text = response.text().await?;
            error!("Failed to get user categories: {}", error_text);
            Err(anyhow!("Failed to get user categories: {}", error_text))
        }
    }

    pub async fn set_user_categories_by_id(&self, token: &str, user_id: &str, categories: &Vec<String>) -> Result<()> {
        let url = format!("{}/admin/realms/{}/users/{}", self.config.url, self.config.realm, user_id);
        // Fetch the user to get their email
        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?;
        let user: serde_json::Value = response.json().await?;
        let user_email = user.get("email").and_then(|e| e.as_str()).unwrap_or("");
        let payload = serde_json::json!({
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
                error!("Failed to set user categories by id: {}", error_text);
                Err(anyhow!("Failed to set user categories by id: {}", error_text))
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

#[derive(Debug, Deserialize)]
pub struct KeycloakUser {
    pub id: String,
    pub username: String,
    pub email: Option<String>,
}