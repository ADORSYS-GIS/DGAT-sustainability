use crate::common::config::KeycloakConfigs;
use crate::common::models::keycloak::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde_json::json;
use std::sync::Arc;
use tracing::{debug, error, info};

#[derive(Debug, Clone)]
pub struct KeycloakService {
    client: Client,
    config: KeycloakConfigs,
}

impl KeycloakService {
    pub fn new(config: KeycloakConfigs) -> Self {
        let client = Client::new();
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
                    // If no body, return an error or a minimal KeycloakOrganization
                    // Here, we return an error to be explicit, but you can adjust as needed
                    Err(anyhow!("Keycloak returned empty body on create (organization was likely created successfully)"))
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
    pub async fn get_organization_members(&self, token: &str, org_id: &str) -> Result<Vec<KeycloakOrganizationMembership>> {
        let url = format!("{}/admin/realms/{}/organizations/{}/memberships", self.config.url, self.config.realm, org_id);

        let response = self.client.get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .error_for_status()?;

        let members: Vec<KeycloakOrganizationMembership> = response.json().await?;
        Ok(members)
    }

    /// Add user to organization
    pub async fn add_user_to_organization(&self, token: &str, org_id: &str, user_id: &str, roles: Vec<String>) -> Result<KeycloakOrganizationMembership> {
        let url = format!("{}/admin/realms/{}/organizations/{}/memberships", self.config.url, self.config.realm, org_id);

        let payload = json!({
            "userId": user_id,
            "roles": roles
        });

        let response = self.client.post(&url)
            .bearer_auth(token)
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::CREATED => {
                let membership: KeycloakOrganizationMembership = response.json().await?;
                Ok(membership)
            },
            _ => {
                let error_text = response.text().await?;
                error!("Failed to add user to organization: {}", error_text);
                Err(anyhow!("Failed to add user to organization: {}", error_text))
            }
        }
    }

    /// Remove user from organization
    pub async fn remove_user_from_organization(&self, token: &str, org_id: &str, membership_id: &str) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}/memberships/{}", 
            self.config.url, self.config.realm, org_id, membership_id);

        let response = self.client.delete(&url)
            .bearer_auth(token)
            .send()
            .await?;

        match response.status() {
            StatusCode::NO_CONTENT => Ok(()),
            _ => {
                let error_text = response.text().await?;
                error!("Failed to remove user from organization: {}", error_text);
                Err(anyhow!("Failed to remove user from organization: {}", error_text))
            }
        }
    }

    /// Update user roles in organization
    pub async fn update_user_roles(&self, token: &str, org_id: &str, membership_id: &str, roles: Vec<String>) -> Result<()> {
        let url = format!("{}/admin/realms/{}/organizations/{}/memberships/{}", 
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
}
