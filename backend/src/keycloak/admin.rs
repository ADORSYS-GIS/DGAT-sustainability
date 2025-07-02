use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Duration;
use thiserror::Error;
use tracing::{error, info};

#[derive(Error, Debug)]
pub enum KeycloakAdminError {
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("API error: {status_code} - {message}")]
    ApiError {
        status_code: StatusCode,
        message: String,
    },

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
    #[serde(rename = "refresh_expires_in")]
    refresh_expires: u64,
    token_type: String,
    #[serde(rename = "not-before-policy")]
    not_before_policy: u64,
    scope: String,
}

#[derive(Debug, Clone)]
pub struct KeycloakAdmin {
    client: Client,
    base_url: String,
    realm: String,
    admin_username: String,
    admin_password: String,
    access_token: Option<String>,
}

impl KeycloakAdmin {
    pub fn new(
        base_url: String,
        realm: String,
        admin_username: String,
        admin_password: String,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url,
            realm,
            admin_username,
            admin_password,
            access_token: None,
        }
    }

    async fn authenticate(&mut self) -> Result<(), KeycloakAdminError> {
        let token_url = format!(
            "{}/realms/master/protocol/openid-connect/token",
            self.base_url
        );

        let params = [
            ("client_id", "admin-cli"),
            ("username", &self.admin_username),
            ("password", &self.admin_password),
            ("grant_type", "password"),
        ];

        let response = self.client.post(&token_url).form(&params).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await?;
            return Err(KeycloakAdminError::ApiError {
                status_code: status,
                message: format!("Authentication failed: {}", body),
            });
        }

        let token_response: TokenResponse = response.json().await?;
        self.access_token = Some(token_response.access_token);

        Ok(())
    }

    async fn ensure_authenticated(&mut self) -> Result<(), KeycloakAdminError> {
        if self.access_token.is_none() {
            self.authenticate().await?
        }
        Ok(())
    }

    pub async fn create_realm_if_not_exists(
        &mut self,
        realm_name: &str,
    ) -> Result<bool, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // Check if realm exists
        let realms_url = format!("{}/admin/realms", self.base_url);
        let response = self
            .client
            .get(&realms_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!("Failed to fetch realms: {}", response.text().await?),
            });
        }

        let realms: Vec<HashMap<String, Value>> = response.json().await?;
        let realm_exists = realms
            .iter()
            .any(|r| r.get("realm").and_then(|v| v.as_str()) == Some(realm_name));

        if realm_exists {
            info!("Realm '{}' already exists", realm_name);
            return Ok(false);
        }

        // Create realm
        let realm_config = json!({
            "realm": realm_name,
            "enabled": true,
            "registrationAllowed": true,
            "registrationEmailAsUsername": false,
            "rememberMe": true,
            "verifyEmail": false,
            "loginWithEmailAllowed": true,
            "duplicateEmailsAllowed": false,
            "resetPasswordAllowed": true,
            "editUsernameAllowed": false,
            "bruteForceProtected": true
        });

        let create_response = self
            .client
            .post(&realms_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&realm_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!("Failed to create realm: {}", create_response.text().await?),
            });
        }

        info!("Successfully created realm '{}'", realm_name);
        Ok(true)
    }

    pub async fn create_client_if_not_exists(
        &mut self,
        client_id: &str,
        client_name: &str,
        redirect_uris: Vec<&str>,
        web_origins: Vec<&str>,
    ) -> Result<bool, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // Check if client exists
        let clients_url = format!("{}/admin/realms/{}/clients", self.base_url, self.realm);
        let response = self
            .client
            .get(&clients_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!("Failed to fetch clients: {}", response.text().await?),
            });
        }

        let clients: Vec<HashMap<String, Value>> = response.json().await?;
        let client_exists = clients
            .iter()
            .any(|c| c.get("clientId").and_then(|v| v.as_str()) == Some(client_id));

        if client_exists {
            info!("Client '{}' already exists", client_id);
            return Ok(false);
        }

        // Create client
        let client_config = json!({
            "clientId": client_id,
            "name": client_name,
            "enabled": true,
            "clientAuthenticatorType": "client-secret",
            "redirectUris": redirect_uris,
            "webOrigins": web_origins,
            "publicClient": true,
            "protocol": "openid-connect",
            "standardFlowEnabled": true,
            "implicitFlowEnabled": false,
            "directAccessGrantsEnabled": true,
            "serviceAccountsEnabled": false,
            "authorizationServicesEnabled": false,
            "fullScopeAllowed": true
        });

        let create_response = self
            .client
            .post(&clients_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&client_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!("Failed to create client: {}", create_response.text().await?),
            });
        }

        info!("Successfully created client '{}'", client_id);
        Ok(true)
    }

    pub async fn create_role_if_not_exists(
        &mut self,
        role_name: &str,
    ) -> Result<bool, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // Check if role exists
        let roles_url = format!("{}/admin/realms/{}/roles", self.base_url, self.realm);
        let response = self
            .client
            .get(&roles_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!("Failed to fetch roles: {}", response.text().await?),
            });
        }

        let roles: Vec<HashMap<String, Value>> = response.json().await?;
        let role_exists = roles
            .iter()
            .any(|r| r.get("name").and_then(|v| v.as_str()) == Some(role_name));

        if role_exists {
            info!("Role '{}' already exists", role_name);
            return Ok(false);
        }

        // Create role
        let role_config = json!({
            "name": role_name,
            "description": format!("Role for {}", role_name),
            "composite": false,
            "clientRole": false
        });

        let create_response = self
            .client
            .post(&roles_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&role_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!("Failed to create role: {}", create_response.text().await?),
            });
        }

        info!("Successfully created role '{}'", role_name);
        Ok(true)
    }

    pub async fn create_organizations_group(&mut self) -> Result<String, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // Create top-level organizations group
        let groups_url = format!("{}/admin/realms/{}/groups", self.base_url, self.realm);

        // Check if group exists first
        let response = self
            .client
            .get(&groups_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!("Failed to fetch groups: {}", response.text().await?),
            });
        }

        let groups: Vec<HashMap<String, Value>> = response.json().await?;
        let org_group = groups
            .iter()
            .find(|g| g.get("name").and_then(|v| v.as_str()) == Some("organizations"));

        if let Some(group) = org_group {
            if let Some(id) = group.get("id").and_then(|v| v.as_str()) {
                info!("Organizations group already exists with ID: {}", id);
                return Ok(id.to_string());
            }
        }

        // Create the group if it doesn't exist
        let group_config = json!({
            "name": "organizations"
        });

        let create_response = self
            .client
            .post(&groups_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&group_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!(
                    "Failed to create organizations group: {}",
                    create_response.text().await?
                ),
            });
        }

        // Get the ID of the newly created group
        let response = self
            .client
            .get(&groups_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!(
                    "Failed to fetch groups after creation: {}",
                    response.text().await?
                ),
            });
        }

        let groups: Vec<HashMap<String, Value>> = response.json().await?;
        let org_group = groups
            .iter()
            .find(|g| g.get("name").and_then(|v| v.as_str()) == Some("organizations"));

        if let Some(group) = org_group {
            if let Some(id) = group.get("id").and_then(|v| v.as_str()) {
                info!("Created organizations group with ID: {}", id);
                return Ok(id.to_string());
            }
        }

        Err(KeycloakAdminError::ApiError {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            message: "Failed to retrieve organization group ID after creation".to_string(),
        })
    }

    pub async fn create_organization_subgroup(
        &mut self,
        parent_id: &str,
        organization: &crate::keycloak::models::Organization<'_>,
    ) -> Result<String, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // Create subgroup
        let subgroup_url = format!(
            "{}/admin/realms/{}/groups/{}/children",
            self.base_url, self.realm, parent_id
        );

        let subgroup_config = json!({
            "name": organization.name
        });

        let create_response = self
            .client
            .post(&subgroup_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&subgroup_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!(
                    "Failed to create organization subgroup: {}",
                    create_response.text().await?
                ),
            });
        }

        // Get the ID of the newly created subgroup
        let groups_url = format!(
            "{}/admin/realms/{}/groups/{}/children",
            self.base_url, self.realm, parent_id
        );
        let response = self
            .client
            .get(&groups_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!(
                    "Failed to fetch subgroups after creation: {}",
                    response.text().await?
                ),
            });
        }

        let subgroups: Vec<HashMap<String, Value>> = response.json().await?;
        let new_subgroup = subgroups
            .iter()
            .find(|g| g.get("name").and_then(|v| v.as_str()) == Some(organization.name));

        if let Some(subgroup) = new_subgroup {
            if let Some(id) = subgroup.get("id").and_then(|v| v.as_str()) {
                // Set attributes
                let attributes_url = format!(
                    "{}/admin/realms/{}/groups/{}",
                    self.base_url, self.realm, id
                );

                let attributes = json!({
                    "name": organization.name,
                    "attributes": {
                        "organization_id": [organization.id],
                        "organization_name": [organization.name],
                        "country": [organization.country]
                    }
                });

                let attr_response = self
                    .client
                    .put(&attributes_url)
                    .header(
                        "Authorization",
                        format!("Bearer {}", self.access_token.as_ref().unwrap()),
                    )
                    .header("Content-Type", "application/json")
                    .json(&attributes)
                    .send()
                    .await?;

                if !attr_response.status().is_success() {
                    return Err(KeycloakAdminError::ApiError {
                        status_code: attr_response.status(),
                        message: format!(
                            "Failed to set organization attributes: {}",
                            attr_response.text().await?
                        ),
                    });
                }

                info!(
                    "Created organization subgroup '{}' with ID: {}",
                    organization.name, id
                );
                return Ok(id.to_string());
            }
        }

        Err(KeycloakAdminError::ApiError {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            message: "Failed to retrieve organization subgroup ID after creation".to_string(),
        })
    }

    pub async fn create_client_mappers(
        &mut self,
        client_id: &str,
    ) -> Result<(), KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // First, get the client UUID
        let clients_url = format!("{}/admin/realms/{}/clients", self.base_url, self.realm);
        let response = self
            .client
            .get(&clients_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!("Failed to fetch clients: {}", response.text().await?),
            });
        }

        let clients: Vec<HashMap<String, Value>> = response.json().await?;
        let client = clients
            .iter()
            .find(|c| c.get("clientId").and_then(|v| v.as_str()) == Some(client_id));

        let client_uuid = if let Some(client) = client {
            if let Some(id) = client.get("id").and_then(|v| v.as_str()) {
                id.to_string()
            } else {
                return Err(KeycloakAdminError::ApiError {
                    status_code: StatusCode::NOT_FOUND,
                    message: format!("Client UUID not found for client ID: {}", client_id),
                });
            }
        } else {
            return Err(KeycloakAdminError::ApiError {
                status_code: StatusCode::NOT_FOUND,
                message: format!("Client not found with ID: {}", client_id),
            });
        };

        // Create mappers
        let mappers = [
            ("organization-id-mapper", "organization_id"),
            ("organization-name-mapper", "organization_name"),
            ("country-mapper", "country"),
        ];

        for (name, attribute) in mappers.iter() {
            let mappers_url = format!(
                "{}/admin/realms/{}/clients/{}/protocol-mappers/models",
                self.base_url, self.realm, client_uuid
            );

            let mapper_config = json!({
                "name": name,
                "protocol": "openid-connect",
                "protocolMapper": "oidc-usermodel-attribute-mapper",
                "consentRequired": false,
                "config": {
                    "userinfo.token.claim": "true",
                    "user.attribute": attribute,
                    "id.token.claim": "true",
                    "access.token.claim": "true",
                    "claim.name": attribute,
                    "jsonType.label": "String"
                }
            });

            let create_response = self
                .client
                .post(&mappers_url)
                .header(
                    "Authorization",
                    format!("Bearer {}", self.access_token.as_ref().unwrap()),
                )
                .header("Content-Type", "application/json")
                .json(&mapper_config)
                .send()
                .await?;

            if !create_response.status().is_success()
                && create_response.status() != StatusCode::CREATED
            {
                return Err(KeycloakAdminError::ApiError {
                    status_code: create_response.status(),
                    message: format!(
                        "Failed to create mapper '{}': {}",
                        name,
                        create_response.text().await?
                    ),
                });
            }

            info!(
                "Created protocol mapper '{}' for attribute '{}'",
                name, attribute
            );
        }

        Ok(())
    }

    pub async fn create_test_user(
        &mut self,
        user: &crate::keycloak::models::NewUser<'_>,
    ) -> Result<String, KeycloakAdminError> {
        self.ensure_authenticated().await?;

        // First check if user exists
        let users_url = format!(
            "{}/admin/realms/{}/users?username={}",
            self.base_url, self.realm, user.username
        );
        let response = self
            .client
            .get(&users_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!(
                    "Failed to check for existing user: {}",
                    response.text().await?
                ),
            });
        }

        let existing_users: Vec<HashMap<String, Value>> = response.json().await?;
        if !existing_users.is_empty() {
            if let Some(existing_user) = existing_users.first() {
                if let Some(id) = existing_user.get("id").and_then(|v| v.as_str()) {
                    info!("User '{}' already exists with ID: {}", user.username, id);
                    return Ok(id.to_string());
                }
            }
        }

        // Create user
        let create_user_url = format!("{}/admin/realms/{}/users", self.base_url, self.realm);

        let user_config = json!({
            "username": user.username,
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "enabled": true,
            "emailVerified": true,
            "attributes": {
                "organization_id": [user.organization_id],
                "organization_name": [user.organization_name]
            },
            "groups": [user.group_id],
            "credentials": [{
                "type": "password",
                "value": user.password,
                "temporary": false
            }]
        });

        let create_response = self
            .client
            .post(&create_user_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&user_config)
            .send()
            .await?;

        if !create_response.status().is_success() && create_response.status() != StatusCode::CREATED
        {
            return Err(KeycloakAdminError::ApiError {
                status_code: create_response.status(),
                message: format!("Failed to create user: {}", create_response.text().await?),
            });
        }

        // Get the ID of the newly created user
        let response = self
            .client
            .get(&users_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: response.status(),
                message: format!(
                    "Failed to get user after creation: {}",
                    response.text().await?
                ),
            });
        }

        let users: Vec<HashMap<String, Value>> = response.json().await?;
        let user_id = if let Some(user) = users.first() {
            if let Some(id) = user.get("id").and_then(|v| v.as_str()) {
                id.to_string()
            } else {
                return Err(KeycloakAdminError::ApiError {
                    status_code: StatusCode::INTERNAL_SERVER_ERROR,
                    message: "Failed to get user ID after creation".to_string(),
                });
            }
        } else {
            return Err(KeycloakAdminError::ApiError {
                status_code: StatusCode::INTERNAL_SERVER_ERROR,
                message: "User not found after creation".to_string(),
            });
        };

        // Assign role
        let role_url = format!(
            "{}/admin/realms/{}/users/{}/role-mappings/realm",
            self.base_url, self.realm, user_id
        );

        // First get the role ID
        let roles_url = format!(
            "{}/admin/realms/{}/roles/{}",
            self.base_url, self.realm, user.role
        );
        let role_response = self
            .client
            .get(&roles_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .send()
            .await?;

        if !role_response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: role_response.status(),
                message: format!(
                    "Failed to get role details: {}",
                    role_response.text().await?
                ),
            });
        }

        let role_details: HashMap<String, Value> = role_response.json().await?;
        let role_assignment = json!([role_details]);

        let assign_response = self
            .client
            .post(&role_url)
            .header(
                "Authorization",
                format!("Bearer {}", self.access_token.as_ref().unwrap()),
            )
            .header("Content-Type", "application/json")
            .json(&role_assignment)
            .send()
            .await?;

        if !assign_response.status().is_success() {
            return Err(KeycloakAdminError::ApiError {
                status_code: assign_response.status(),
                message: format!("Failed to assign role: {}", assign_response.text().await?),
            });
        }

        info!(
            "Successfully created user '{}' with ID: {}",
            user.username, user_id
        );
        Ok(user_id)
    }
}
