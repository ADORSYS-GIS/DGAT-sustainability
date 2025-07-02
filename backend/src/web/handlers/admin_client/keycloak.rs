use crate::common::models::organization::{
    OrganizationRequest, OrganizationResponse, UserRequest, UserResponse,
};
use reqwest::Client;
use serde_json::{json, Value};
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum KeycloakError {
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    #[error("User creation failed: {0}")]
    UserCreationFailed(String),
    #[error("Group creation failed: {0}")]
    GroupCreationFailed(String),
    #[error("Role assignment failed: {0}")]
    RoleAssignmentFailed(String),
    #[error("Organization not found: {0}")]
    OrganizationNotFound(String),
    #[error("User not found: {0}")]
    UserNotFound(String),
}

#[derive(Clone)]
pub struct KeycloakAdminClient {
    client: Client,
    base_url: String,
    realm: String,
    client_id: String,
    client_secret: String,
}

impl KeycloakAdminClient {
    pub fn new(base_url: String, realm: String, client_id: String, client_secret: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            realm,
            client_id,
            client_secret,
        }
    }

    async fn get_admin_token(&self) -> Result<String, KeycloakError> {
        let token_url = format!(
            "{}/realms/{}/protocol/openid-connect/token",
            self.base_url, self.realm
        );

        let params = [
            ("grant_type", "client_credentials"),
            ("client_id", &self.client_id),
            ("client_secret", &self.client_secret),
        ];

        let response = self.client.post(&token_url).form(&params).send().await?;

        if !response.status().is_success() {
            return Err(KeycloakError::AuthenticationFailed(format!(
                "Failed to get admin token: {}",
                response.status()
            )));
        }

        let token_response: Value = response.json().await?;
        let access_token = token_response["access_token"].as_str().ok_or_else(|| {
            KeycloakError::AuthenticationFailed("No access token in response".to_string())
        })?;

        Ok(access_token.to_string())
    }

    pub async fn create_organization(
        &self,
        org: OrganizationRequest,
    ) -> Result<OrganizationResponse, KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let organization_id = Uuid::new_v4().to_string();

        // Create group for organization
        let group_url = format!("{}/admin/realms/{}/groups", self.base_url, self.realm);

        let group_data = json!({
            "name": format!("organizations/{}", org.name.to_lowercase().replace(" ", "-")),
            "attributes": {
                "organization_id": [&organization_id],
                "organization_name": [&org.name],
                "organization_description": org.description.as_ref().map(|d| vec![d]).unwrap_or_default(),
                "organization_country": org.country.as_ref().map(|c| vec![c]).unwrap_or_default()
            }
        });

        let response = self
            .client
            .post(&group_url)
            .bearer_auth(&admin_token)
            .json(&group_data)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::GroupCreationFailed(format!(
                "Failed to create organization group: {}",
                response.status()
            )));
        }

        Ok(OrganizationResponse {
            id: organization_id,
            name: org.name,
            description: org.description,
            country: org.country,
        })
    }

    pub async fn create_user_in_organization(
        &self,
        user: UserRequest,
    ) -> Result<UserResponse, KeycloakError> {
        let admin_token = self.get_admin_token().await?;

        // Create user
        let user_url = format!("{}/admin/realms/{}/users", self.base_url, self.realm);

        let user_data = json!({
            "username": user.username,
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "enabled": true,
            "emailVerified": true,
            "attributes": {
                "organization_id": [&user.organization_id],
                "organization_name": [""] // Will be updated when added to group
            },
            "credentials": [{
                "type": "password",
                "value": user.password,
                "temporary": false
            }]
        });

        let response = self
            .client
            .post(&user_url)
            .bearer_auth(&admin_token)
            .json(&user_data)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::UserCreationFailed(format!(
                "Failed to create user: {}",
                response.status()
            )));
        }

        // Extract user ID from Location header
        let location = response
            .headers()
            .get("Location")
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| KeycloakError::UserCreationFailed("No location header".to_string()))?;

        let user_id = location.split('/').last().ok_or_else(|| {
            KeycloakError::UserCreationFailed("Invalid location header".to_string())
        })?;

        // Find organization group
        let group_id = self
            .find_organization_group(&admin_token, &user.organization_id)
            .await?;

        // Add user to organization group
        let join_group_url = format!(
            "{}/admin/realms/{}/users/{}/groups/{}",
            self.base_url, self.realm, user_id, group_id
        );

        let response = self
            .client
            .put(&join_group_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        if !response.status().is_success() {
            tracing::warn!(
                "Failed to add user to organization group: {}",
                response.status()
            );
        }

        Ok(UserResponse {
            id: user_id.to_string(),
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            organization_id: user.organization_id,
        })
    }

    async fn find_organization_group(
        &self,
        admin_token: &str,
        organization_id: &str,
    ) -> Result<String, KeycloakError> {
        let groups_url = format!("{}/admin/realms/{}/groups", self.base_url, self.realm);

        let response = self
            .client
            .get(&groups_url)
            .bearer_auth(admin_token)
            .query(&[("search", "organizations/")])
            .send()
            .await?;

        let groups: Vec<Value> = response.json().await?;

        for group in groups {
            if let Some(attributes) = group["attributes"].as_object() {
                if let Some(org_id_array) = attributes.get("organization_id") {
                    if let Some(org_id) = org_id_array.as_array().and_then(|arr| arr.first()) {
                        if org_id.as_str() == Some(organization_id) {
                            return Ok(group["id"].as_str().unwrap().to_string());
                        }
                    }
                }
            }
        }

        Err(KeycloakError::GroupCreationFailed(
            "Organization group not found".to_string(),
        ))
    }

    /// Assign a role to a user
    pub async fn assign_role_to_user(
        &self,
        user_id: &str,
        role_name: &str,
    ) -> Result<(), KeycloakError> {
        let admin_token = self.get_admin_token().await?;

        // Get realm roles
        let roles_url = format!("{}/admin/realms/{}/roles", self.base_url, self.realm);
        let response = self
            .client
            .get(&roles_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        let roles: Vec<Value> = response.json().await?;
        let role = roles
            .iter()
            .find(|r| r["name"].as_str() == Some(role_name))
            .ok_or_else(|| {
                KeycloakError::RoleAssignmentFailed(format!("Role '{}' not found", role_name))
            })?;

        // Assign role to user
        let assign_url = format!(
            "{}/admin/realms/{}/users/{}/role-mappings/realm",
            self.base_url, self.realm, user_id
        );

        let role_data = json!([{
            "id": role["id"],
            "name": role["name"]
        }]);

        let response = self
            .client
            .post(&assign_url)
            .bearer_auth(&admin_token)
            .json(&role_data)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::RoleAssignmentFailed(format!(
                "Failed to assign role: {}",
                response.status()
            )));
        }

        Ok(())
    }

    /// Create organization admin user
    pub async fn create_organization_admin(
        &self,
        user: UserRequest,
    ) -> Result<UserResponse, KeycloakError> {
        let user_response = self.create_user_in_organization(user).await?;

        // Assign organization_admin role
        self.assign_role_to_user(&user_response.id, "organization_admin")
            .await?;

        Ok(user_response)
    }

    /// List all organizations
    pub async fn list_organizations(&self) -> Result<Vec<OrganizationResponse>, KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let groups_url = format!("{}/admin/realms/{}/groups", self.base_url, self.realm);

        let response = self
            .client
            .get(&groups_url)
            .bearer_auth(&admin_token)
            .query(&[("search", "organizations/")])
            .send()
            .await?;

        let groups: Vec<Value> = response.json().await?;
        let mut organizations = Vec::new();

        for group in groups {
            if let Some(attributes) = group["attributes"].as_object() {
                if let (Some(org_id), Some(org_name)) = (
                    attributes
                        .get("organization_id")
                        .and_then(|arr| arr.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.as_str()),
                    attributes
                        .get("organization_name")
                        .and_then(|arr| arr.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.as_str()),
                ) {
                    let description = attributes
                        .get("organization_description")
                        .and_then(|arr| arr.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let country = attributes
                        .get("organization_country")
                        .and_then(|arr| arr.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    organizations.push(OrganizationResponse {
                        id: org_id.to_string(),
                        name: org_name.to_string(),
                        description,
                        country,
                    });
                }
            }
        }

        Ok(organizations)
    }

    /// Get organization by ID
    pub async fn get_organization(
        &self,
        organization_id: &str,
    ) -> Result<OrganizationResponse, KeycloakError> {
        let organizations = self.list_organizations().await?;
        organizations
            .into_iter()
            .find(|org| org.id == organization_id)
            .ok_or_else(|| KeycloakError::OrganizationNotFound(organization_id.to_string()))
    }

    /// Update organization
    pub async fn update_organization(
        &self,
        organization_id: &str,
        org: OrganizationRequest,
    ) -> Result<OrganizationResponse, KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let group_id = self
            .find_organization_group(&admin_token, organization_id)
            .await?;

        let group_url = format!(
            "{}/admin/realms/{}/groups/{}",
            self.base_url, self.realm, group_id
        );

        let group_data = json!({
            "name": format!("organizations/{}", org.name.to_lowercase().replace(" ", "-")),
            "attributes": {
                "organization_id": [organization_id],
                "organization_name": [&org.name],
                "organization_description": org.description.as_ref().map(|d| vec![d]).unwrap_or_default(),
                "organization_country": org.country.as_ref().map(|c| vec![c]).unwrap_or_default()
            }
        });

        let response = self
            .client
            .put(&group_url)
            .bearer_auth(&admin_token)
            .json(&group_data)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::GroupCreationFailed(format!(
                "Failed to update organization: {}",
                response.status()
            )));
        }

        Ok(OrganizationResponse {
            id: organization_id.to_string(),
            name: org.name,
            description: org.description,
            country: org.country,
        })
    }

    /// Delete organization
    pub async fn delete_organization(&self, organization_id: &str) -> Result<(), KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let group_id = self
            .find_organization_group(&admin_token, organization_id)
            .await?;

        let group_url = format!(
            "{}/admin/realms/{}/groups/{}",
            self.base_url, self.realm, group_id
        );

        let response = self
            .client
            .delete(&group_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::GroupCreationFailed(format!(
                "Failed to delete organization: {}",
                response.status()
            )));
        }

        Ok(())
    }

    /// List users in organization
    pub async fn list_organization_users(
        &self,
        organization_id: &str,
    ) -> Result<Vec<UserResponse>, KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let group_id = self
            .find_organization_group(&admin_token, organization_id)
            .await?;

        let members_url = format!(
            "{}/admin/realms/{}/groups/{}/members",
            self.base_url, self.realm, group_id
        );

        let response = self
            .client
            .get(&members_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        let users: Vec<Value> = response.json().await?;
        let mut user_responses = Vec::new();

        for user in users {
            if let (Some(id), Some(username), Some(email)) = (
                user["id"].as_str(),
                user["username"].as_str(),
                user["email"].as_str(),
            ) {
                let first_name = user["firstName"].as_str().unwrap_or("").to_string();
                let last_name = user["lastName"].as_str().unwrap_or("").to_string();

                user_responses.push(UserResponse {
                    id: id.to_string(),
                    username: username.to_string(),
                    email: email.to_string(),
                    first_name,
                    last_name,
                    organization_id: organization_id.to_string(),
                });
            }
        }

        Ok(user_responses)
    }

    /// Get user by ID
    pub async fn get_user(&self, user_id: &str) -> Result<UserResponse, KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let user_url = format!(
            "{}/admin/realms/{}/users/{}",
            self.base_url, self.realm, user_id
        );

        let response = self
            .client
            .get(&user_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::UserNotFound(user_id.to_string()));
        }

        let user: Value = response.json().await?;

        let organization_id = user["attributes"]["organization_id"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        Ok(UserResponse {
            id: user["id"].as_str().unwrap_or("").to_string(),
            username: user["username"].as_str().unwrap_or("").to_string(),
            email: user["email"].as_str().unwrap_or("").to_string(),
            first_name: user["firstName"].as_str().unwrap_or("").to_string(),
            last_name: user["lastName"].as_str().unwrap_or("").to_string(),
            organization_id,
        })
    }

    /// Delete user
    pub async fn delete_user(&self, user_id: &str) -> Result<(), KeycloakError> {
        let admin_token = self.get_admin_token().await?;
        let user_url = format!(
            "{}/admin/realms/{}/users/{}",
            self.base_url, self.realm, user_id
        );

        let response = self
            .client
            .delete(&user_url)
            .bearer_auth(&admin_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakError::UserCreationFailed(format!(
                "Failed to delete user: {}",
                response.status()
            )));
        }

        Ok(())
    }
}
