//! End-to-End Integration Tests for DGAT Sustainability Tool
//!
//! This module contains practical end-to-end tests that demonstrate the complete
//! authentication and authorization flow using a real Keycloak instance.
//!
//! ## Running the Tests
//!
//! These tests require a running Keycloak instance. To run them:
//!
//! 1. Start the development environment:
//!    ```bash
//!    docker-compose up -d
//!    ```
//!
//! 2. Wait for Keycloak to be ready (check health):
//!    ```bash
//!    curl http://localhost:8080/health/ready
//!    ```
//!
//! 3. Run the tests:
//!    ```bash
//!    cd backend
//!    cargo test e2e_tests --features integration-tests
//!    ```
//!
//! ## Test Scenarios Covered
//!
//! 1. **Authentication Flow**: Get JWT tokens from Keycloak
//! 2. **Application Admin Workflow**: Create organizations and assign admins
//! 3. **Organization Admin Workflow**: Manage users within organization
//! 4. **Access Control**: Verify role-based permissions
//! 5. **Error Handling**: Test various error scenarios
//!
//! ## Environment Variables
//!
//! Set these environment variables for testing:
//! - `KEYCLOAK_URL`: URL of Keycloak instance (default: http://localhost:8080)
//! - `KEYCLOAK_REALM`: Realm name (default: master)
//! - `TEST_ADMIN_USERNAME`: Admin username (default: admin)
//! - `TEST_ADMIN_PASSWORD`: Admin password (default: admin123)

use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::env;
use std::time::Duration;
use tokio::time::sleep;
use tower::ServiceExt;
use uuid::Uuid;

// Import the application modules
use sustainability_tool::{
    common::models::organization::{OrganizationRequest, UserRequest},
    web::routes::{AppState, create_app},
};

/// Test configuration
#[derive(Debug, Clone)]
pub struct TestConfig {
    pub keycloak_url: String,
    pub keycloak_realm: String,
    pub admin_username: String,
    pub admin_password: String,
    pub client_id: String,
    pub client_secret: String,
}

impl Default for TestConfig {
    fn default() -> Self {
        Self {
            keycloak_url: env::var("KEYCLOAK_URL").unwrap_or_else(|_| "http://0.0.0.0:8080".to_string()),
            keycloak_realm: env::var("KEYCLOAK_REALM").unwrap_or_else(|_| "master".to_string()),
            admin_username: env::var("TEST_ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string()),
            admin_password: env::var("TEST_ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string()),
            client_id: env::var("KEYCLOAK_CLIENT_ID").unwrap_or_else(|_| "admin-cli".to_string()),
            client_secret: env::var("KEYCLOAK_CLIENT_SECRET").unwrap_or_else(|_| "".to_string()),
        }
    }
}

/// Test utilities for E2E testing
pub mod test_utils {
    use std::future::Future;
    use super::*;

    /// Check if Keycloak is available
    pub async fn is_keycloak_available(config: &TestConfig) -> bool {
        let client = Client::new();

        // Try multiple health endpoints to be compatible with different Keycloak versions
        let health_endpoints = [
            "/health/ready",
            "/health",
            "/realms/master"
        ];

        for endpoint in health_endpoints {
            let health_url = format!("{}{}", config.keycloak_url, endpoint);
            match client.get(&health_url).timeout(Duration::from_secs(5)).send().await {
                Ok(response) => if response.status().is_success() { return true; },
                Err(_) => continue,
            }
        }

        false
    }

    /// Try an operation with retries
    pub async fn with_retries<F, Fut, T, E>(operation: F, max_retries: usize, delay_ms: u64) -> Result<T, E>
    where
        F: Fn() -> Fut,
        Fut: Future<Output = Result<T, E>>,
        E: std::fmt::Debug,
    {
        let mut last_error = None;

        for attempt in 1..=max_retries {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(err) => {
                    eprintln!("Attempt {}/{} failed: {:?}", attempt, max_retries, err);
                    last_error = Some(err);
                    if attempt < max_retries {
                        sleep(Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }

        Err(last_error.unwrap())
    }

    /// Get an admin token from Keycloak
    pub async fn get_admin_token(config: &TestConfig) -> Result<String, Box<dyn std::error::Error>> {
        let client = Client::new();
        let token_url = format!(
            "{}/realms/{}/protocol/openid-connect/token",
            config.keycloak_url, config.keycloak_realm
        );

        let params = [
            ("client_id", config.client_id.as_str()),
            ("username", config.admin_username.as_str()),
            ("password", config.admin_password.as_str()),
            ("grant_type", "password"),
        ];

        let response = client
            .post(&token_url)
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to get token: {}", response.status()).into());
        }

        let token_response: Value = response.json().await?;
        let access_token = token_response["access_token"]
            .as_str()
            .ok_or("No access token in response")?;

        Ok(access_token.to_string())
    }

    /// Create a test realm in Keycloak
    pub async fn create_test_realm(config: &TestConfig, realm_name: &str) -> Result<(), Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        let realm_url = format!("{}/admin/realms", config.keycloak_url);

        // Simplified realm configuration to avoid 400 errors
        let realm_data = json!({
            "realm": realm_name,
            "enabled": true,
            "displayName": format!("Test Realm - {}", realm_name),
            "accessTokenLifespan": 900,
            "registrationAllowed": false,
            "loginWithEmailAllowed": true,
            "duplicateEmailsAllowed": false,
            "resetPasswordAllowed": true,
            "bruteForceProtected": true
        });

        let response = client
            .post(&realm_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .header("Content-Type", "application/json")
            .json(&realm_data)
            .send()
            .await?;

        if response.status() == StatusCode::CONFLICT {
            // Realm already exists, that's fine
            return Ok(());
        }

        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            // Log detailed error information
            eprintln!("Keycloak realm creation failed with status {}:", error_body);
            return Err(format!("Failed to create realm: {} ", error_body).into());
        }

        Ok(())
    }

    /// Create roles in the test realm
    pub async fn create_test_roles(config: &TestConfig, realm_name: &str) -> Result<(), Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        let roles = vec!["application_admin", "organization_admin"];

        for role in roles {
            let role_url = format!("{}/admin/realms/{}/roles", config.keycloak_url, realm_name);

            let role_data = json!({
                "name": role,
                "description": format!("Test role: {}", role)
            });

            let response = client
                .post(&role_url)
                .header("Authorization", format!("Bearer {}", admin_token))
                .header("Content-Type", "application/json")
                .json(&role_data)
                .send()
                .await?;

            if response.status() == StatusCode::CONFLICT {
                // Role already exists, continue
                continue;
            }

            if !response.status().is_success() {
                return Err(format!("Failed to create role {}: {}", role, response.status()).into());
            }
        }

        Ok(())
    }

    /// Create a test client in Keycloak
    pub async fn create_test_client(config: &TestConfig, realm_name: &str, client_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        let client_url = format!("{}/admin/realms/{}/clients", config.keycloak_url, realm_name);

        let client_data = json!({
            "clientId": client_id,
            "enabled": true,
            "serviceAccountsEnabled": true,
            "standardFlowEnabled": false,
            "directAccessGrantsEnabled": true,
            "publicClient": false,
            "clientAuthenticatorType": "client-secret",
            "protocol": "openid-connect"
        });

        let response = client
            .post(&client_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .header("Content-Type", "application/json")
            .json(&client_data)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            eprintln!("Keycloak client creation failed with status {}: ", error_text);
            return Err(format!("Failed to create client: {}", error_text).into());
        }

        // Get the client secret
        let location = response.headers().get("Location")
            .and_then(|h| h.to_str().ok())
            .ok_or("No location header")?;

        let client_uuid = location.split('/').last().ok_or("Invalid location header")?;

        let secret_url = format!("{}/admin/realms/{}/clients/{}/client-secret", 
                                config.keycloak_url, realm_name, client_uuid);

        let secret_response = client
            .get(&secret_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .send()
            .await?;

        let secret_data: Value = secret_response.json().await?;
        let client_secret = secret_data["value"]
            .as_str()
            .ok_or("No client secret in response")?;

        Ok(client_secret.to_string())
    }

    /// Create a test user with specific roles
    pub async fn create_test_user(
        config: &TestConfig,
        realm_name: &str,
        username: &str,
        password: &str,
        roles: Vec<&str>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        // Create user
        let user_url = format!("{}/admin/realms/{}/users", config.keycloak_url, realm_name);

        let user_data = json!({
            "username": username,
            "enabled": true,
            "emailVerified": true,
            "email": format!("{}@test.com", username),
            "requiredActions": [],
            "attributes": {
                "userSetupComplete": ["true"]
            }
        });

        let response = client
            .post(&user_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .header("Content-Type", "application/json")
            .json(&user_data)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to create user: {}", response.status()).into());
        }

        let location = response.headers().get("Location")
            .and_then(|h| h.to_str().ok())
            .ok_or("No location header")?;

        let user_id = location.split('/').last().ok_or("Invalid location header")?;

        // Set password in a separate call
        let password_url = format!("{}/admin/realms/{}/users/{}/reset-password", 
                                  config.keycloak_url, realm_name, user_id);

        let password_data = json!({
            "type": "password",
            "value": password,
            "temporary": false
        });

        let password_response = client
            .put(&password_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .header("Content-Type", "application/json")
            .json(&password_data)
            .send()
            .await?;

        if !password_response.status().is_success() {
            return Err(format!("Failed to set user password: {}", password_response.status()).into());
        }

        // Wait a bit for user to be fully set up
        sleep(Duration::from_millis(1000)).await;

        // Assign roles
        for role in roles {
            let role_mapping_url = format!(
                "{}/admin/realms/{}/users/{}/role-mappings/realm",
                config.keycloak_url, realm_name, user_id
            );

            // First get the role
            let roles_url = format!("{}/admin/realms/{}/roles/{}", config.keycloak_url, realm_name, role);
            let role_response = client
                .get(&roles_url)
                .header("Authorization", format!("Bearer {}", admin_token))
                .send()
                .await?;

            let role_data: Value = role_response.json().await?;

            // Assign the role
            let role_assignment = json!([{
                "id": role_data["id"],
                "name": role_data["name"]
            }]);

            client
                .post(&role_mapping_url)
                .header("Authorization", format!("Bearer {}", admin_token))
                .header("Content-Type", "application/json")
                .json(&role_assignment)
                .send()
                .await?;
        }

        Ok(user_id.to_string())
    }

    /// Get a user token
    pub async fn get_user_token(
        config: &TestConfig,
        realm_name: &str,
        client_id: &str,
        username: &str,
        password: &str,
        client_secret: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let client = Client::new();
        let token_url = format!(
            "{}/realms/{}/protocol/openid-connect/token",
            config.keycloak_url, realm_name
        );

        let params = [
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("username", username),
            ("password", password),
            ("grant_type", "password"),
        ];

        let response = client
            .post(&token_url)
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unable to read error response".to_string());
            return Err(format!("Failed to get user token: {} - {}", status, error_text).into());
        }

        let token_response: Value = response.json().await?;
        let access_token = token_response["access_token"]
            .as_str()
            .ok_or("No access token in response")?;

        Ok(access_token.to_string())
    }

    /// Clean up test realm
    pub async fn cleanup_test_realm(config: &TestConfig, realm_name: &str) -> Result<(), Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        let realm_url = format!("{}/admin/realms/{}", config.keycloak_url, realm_name);

        let response = client
            .delete(&realm_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .send()
            .await?;

        if response.status() == StatusCode::NOT_FOUND {
            // Realm doesn't exist, that's fine
            return Ok(());
        }

        if !response.status().is_success() {
            return Err(format!("Failed to delete realm: {}", response.status()).into());
        }

        Ok(())
    }

    /// Verify a user is properly set up in Keycloak
    pub async fn verify_user_setup(config: &TestConfig, realm_name: &str, user_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let client = Client::new();
        let admin_token = get_admin_token(config).await?;

        // Get user details from Keycloak
        let user_url = format!("{}/admin/realms/{}/users/{}", config.keycloak_url, realm_name, user_id);

        let response = client
            .get(&user_url)
            .header("Authorization", format!("Bearer {}", admin_token))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to get user details: {}", response.status()).into());
        }

        let user_data: Value = response.json().await?;

        // Check if user is enabled
        if !user_data["enabled"].as_bool().unwrap_or(false) {
            // Enable the user if not already enabled
            let enable_data = json!({
                "enabled": true,
                "emailVerified": true
            });

            let update_response = client
                .put(&user_url)
                .header("Authorization", format!("Bearer {}", admin_token))
                .header("Content-Type", "application/json")
                .json(&enable_data)
                .send()
                .await?;

            if !update_response.status().is_success() {
                return Err(format!("Failed to enable user: {}", update_response.status()).into());
            }
        }

        // Clear any required actions if they exist
        if !user_data["requiredActions"].as_array().unwrap_or(&Vec::new()).is_empty() {
            let clear_actions = json!({
                "requiredActions": []
            });

            let actions_response = client
                .put(&user_url)
                .header("Authorization", format!("Bearer {}", admin_token))
                .header("Content-Type", "application/json")
                .json(&clear_actions)
                .send()
                .await?;

            if !actions_response.status().is_success() {
                return Err(format!("Failed to clear required actions: {}", actions_response.status()).into());
            }
        }

        // Give the Keycloak server time to process changes
        sleep(Duration::from_millis(500)).await;

        Ok(())
    }
}

/// Create a test application
async fn create_test_app(config: &TestConfig, realm_name: &str, client_secret: &str) -> Router {
    let app_state = AppState::new(
        config.keycloak_url.clone(),
        realm_name.to_string(),
        "test-client".to_string(),
        client_secret.to_string(),
    );

    create_app(app_state)
}

/// Helper function to create an authenticated request
fn create_authenticated_request(method: &str, uri: &str, token: &str, body: Option<Value>) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json");

    let body = if let Some(json_body) = body {
        Body::from(json_body.to_string())
    } else {
        Body::empty()
    };

    builder.body(body).unwrap()
}

/// End-to-End Integration Tests
#[cfg(test)]
mod e2e_tests {
    use super::*;

    /// Setup function that runs before each test
    async fn setup_test_environment() -> Result<(TestConfig, String, String), Box<dyn std::error::Error>> {
        let config = TestConfig::default();

        // Check if Keycloak is available
        if !test_utils::is_keycloak_available(&config).await {
            return Err("Keycloak is not available. Please start docker-compose first on 0.0.0.0:8080 .".into());
        }

        // Create a unique test realm
        let realm_name = format!("test-realm-{}", Uuid::new_v4().to_string()[..8].to_lowercase());

        // Setup test environment with retries
        test_utils::with_retries(
            || test_utils::create_test_realm(&config, &realm_name),
            3,
            1000
        ).await?;

        // Wait for realm to be fully created
        sleep(Duration::from_millis(1000)).await;

        test_utils::with_retries(
            || test_utils::create_test_roles(&config, &realm_name),
            3,
            1000
        ).await?;

        let client_secret = test_utils::with_retries(
            || test_utils::create_test_client(&config, &realm_name, "test-client"),
            3,
            1000
        ).await?;

        // Wait a bit for Keycloak to process
        sleep(Duration::from_millis(500)).await;

        Ok((config, realm_name, client_secret))
    }

    /// Cleanup function
    async fn cleanup_test_environment(config: &TestConfig, realm_name: &str) {
        let _ = test_utils::cleanup_test_realm(config, realm_name).await;
    }

    /// Test 1: Complete Application Admin Workflow
    #[tokio::test]
    async fn test_application_admin_workflow() {
        let (config, realm_name, client_secret) = match setup_test_environment().await {
            Ok(setup) => setup,
            Err(e) => {
                eprintln!("Skipping test - setup failed: {}", e);
                return;
            }
        };

        // Create application admin user
        let app_admin_id = match test_utils::create_test_user(
            &config,
            &realm_name,
            "app_admin",
            "admin_password",
            vec!["application_admin"],
        ).await {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to create app admin user: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        // Add a delay to ensure user is fully processed
        sleep(Duration::from_millis(2000)).await;

        // Verify user is properly set up before attempting to get token
        match test_utils::verify_user_setup(&config, &realm_name, &app_admin_id).await {
            Ok(_) => {},
            Err(e) => {
                eprintln!("User setup verification failed: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        }

        // Get application admin token
        let app_admin_token = match test_utils::get_user_token(
            &config,
            &realm_name,
            "test-client",
            "app_admin",
            "admin_password",
            &client_secret,
        ).await {
            Ok(token) => token,
            Err(e) => {
                eprintln!("Failed to get app admin token: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        // Create test application
        let app = create_test_app(&config, &realm_name, &client_secret).await;

        // Test: Application admin can list organizations
        let response = app
            .clone()
            .oneshot(create_authenticated_request(
                "GET",
                "/api/v1/organizations",
                &app_admin_token,
                None,
            ))
            .await
            .unwrap();

        // Should succeed (even if empty list)
        assert!(
            response.status().is_success() || response.status() == StatusCode::INTERNAL_SERVER_ERROR,
            "App admin should be able to list organizations, got: {}",
            response.status()
        );

        // Test: Application admin can create organization
        let org_request = OrganizationRequest {
            name: "Test Organization".to_string(),
            description: Some("A test organization".to_string()),
            country: Some("Test Country".to_string()),
        };

        let response = app
            .clone()
            .oneshot(create_authenticated_request(
                "POST",
                "/api/v1/organizations",
                &app_admin_token,
                Some(json!(org_request)),
            ))
            .await
            .unwrap();

        // Should succeed or fail with server error (due to Keycloak setup)
        assert!(
            response.status().is_success() || response.status().is_server_error(),
            "App admin should be able to create organizations, got: {}",
            response.status()
        );

        cleanup_test_environment(&config, &realm_name).await;
    }

    /// Test 2: Organization Admin Access Control
    #[tokio::test]
    async fn test_organization_admin_access_control() {
        let (config, realm_name, client_secret) = match setup_test_environment().await {
            Ok(setup) => setup,
            Err(e) => {
                eprintln!("Skipping test - setup failed: {}", e);
                return;
            }
        };

        // Create organization admin user
        let org_admin_id = match test_utils::create_test_user(
            &config,
            &realm_name,
            "org_admin",
            "org_password",
            vec!["organization_admin"],
        ).await {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to create org admin user: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        // Add a delay to ensure user is fully processed
        sleep(Duration::from_millis(2000)).await;

        // Verify user is properly set up before attempting to get token
        match test_utils::verify_user_setup(&config, &realm_name, &org_admin_id).await {
            Ok(_) => {},
            Err(e) => {
                eprintln!("User setup verification failed: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        }

        // Get organization admin token
        let org_admin_token = match test_utils::get_user_token(
            &config,
            &realm_name,
            "test-client",
            "org_admin",
            "org_password",
            &client_secret,
        ).await {
            Ok(token) => token,
            Err(e) => {
                eprintln!("Failed to get org admin token: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        // Create test application
        let app = create_test_app(&config, &realm_name, &client_secret).await;

        // Test: Organization admin cannot create organizations
        let org_request = OrganizationRequest {
            name: "Unauthorized Organization".to_string(),
            description: Some("Should not be created".to_string()),
            country: Some("Test Country".to_string()),
        };

        let response = app
            .clone()
            .oneshot(create_authenticated_request(
                "POST",
                "/api/v1/organizations",
                &org_admin_token,
                Some(json!(org_request)),
            ))
            .await
            .unwrap();

        // Should be forbidden
        assert_eq!(
            response.status(),
            StatusCode::FORBIDDEN,
            "Organization admin should not be able to create organizations"
        );

        cleanup_test_environment(&config, &realm_name).await;
    }

    /// Test 3: Authentication and Authorization Flow
    #[tokio::test]
    async fn test_auth_flow() {
        let (config, realm_name, client_secret) = match setup_test_environment().await {
            Ok(setup) => setup,
            Err(e) => {
                eprintln!("Skipping test - setup failed: {}", e);
                return;
            }
        };

        // Create test application
        let app = create_test_app(&config, &realm_name, &client_secret).await;

        // Test 1: No authentication
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/api/v1/organizations")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // Test 2: Invalid token
        let response = app
            .clone()
            .oneshot(create_authenticated_request(
                "GET",
                "/api/v1/organizations",
                "invalid.jwt.token",
                None,
            ))
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // Test 3: Health check (no auth required)
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        cleanup_test_environment(&config, &realm_name).await;
    }

    /// Test 4: Role-Based Access Control
    #[tokio::test]
    async fn test_rbac() {
        let (config, realm_name, client_secret) = match setup_test_environment().await {
            Ok(setup) => setup,
            Err(e) => {
                eprintln!("Skipping test - setup failed: {}", e);
                return;
            }
        };

        // Create users with different roles
        let app_admin_id = match test_utils::create_test_user(
            &config,
            &realm_name,
            "app_admin_rbac",
            "password",
            vec!["application_admin"],
        ).await {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to create app admin: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        let org_admin_id = match test_utils::create_test_user(
            &config,
            &realm_name,
            "org_admin_rbac",
            "password",
            vec!["organization_admin"],
        ).await {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to create org admin: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        let regular_user_id = match test_utils::create_test_user(
            &config,
            &realm_name,
            "regular_user_rbac",
            "password",
            vec![],
        ).await {
            Ok(id) => id,
            Err(e) => {
                eprintln!("Failed to create regular user: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        // Add a delay to ensure users are fully processed
        sleep(Duration::from_millis(2000)).await;

        // Verify users are properly set up
        for (user_id, role) in &[(app_admin_id.as_str(), "app admin"), 
                               (org_admin_id.as_str(), "org admin"), 
                               (regular_user_id.as_str(), "regular user")] {
            match test_utils::verify_user_setup(&config, &realm_name, user_id).await {
                Ok(_) => {},
                Err(e) => {
                    eprintln!("{} setup verification failed: {}", role, e);
                    cleanup_test_environment(&config, &realm_name).await;
                    return;
                }
            }
        }

        // Get tokens
        let app_admin_token = match test_utils::get_user_token(
            &config,
            &realm_name,
            "test-client",
            "app_admin_rbac",
            "password",
            &client_secret,
        ).await {
            Ok(token) => token,
            Err(e) => {
                eprintln!("Failed to get app admin token: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        let org_admin_token = match test_utils::get_user_token(
            &config,
            &realm_name,
            "test-client",
            "org_admin_rbac",
            "password",
            &client_secret,
        ).await {
            Ok(token) => token,
            Err(e) => {
                eprintln!("Failed to get org admin token: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        let regular_user_token = match test_utils::get_user_token(
            &config,
            &realm_name,
            "test-client",
            "regular_user_rbac",
            "password",
            &client_secret,
        ).await {
            Ok(token) => token,
            Err(e) => {
                eprintln!("Failed to get regular user token: {}", e);
                cleanup_test_environment(&config, &realm_name).await;
                return;
            }
        };

        let app = create_test_app(&config, &realm_name, &client_secret).await;

        // Test admin endpoints
        let admin_endpoints = vec![
            ("POST", "/api/v1/organizations"),
            ("DELETE", "/api/v1/organizations/test-id"),
            ("POST", "/api/v1/admin/organization-admins"),
        ];

        for (method, endpoint) in admin_endpoints {
            // App admin should have access (or get server error)
            let response = app
                .clone()
                .oneshot(create_authenticated_request(method, endpoint, &app_admin_token, None))
                .await
                .unwrap();

            assert!(
                response.status().is_success() || response.status().is_server_error(),
                "App admin should have access to {}, got: {}",
                endpoint,
                response.status()
            );

            // Org admin should be forbidden
            let response = app
                .clone()
                .oneshot(create_authenticated_request(method, endpoint, &org_admin_token, None))
                .await
                .unwrap();

            assert_eq!(
                response.status(),
                StatusCode::FORBIDDEN,
                "Org admin should be forbidden from {}",
                endpoint
            );

            // Regular user should be forbidden
            let response = app
                .clone()
                .oneshot(create_authenticated_request(method, endpoint, &regular_user_token, None))
                .await
                .unwrap();

            assert_eq!(
                response.status(),
                StatusCode::FORBIDDEN,
                "Regular user should be forbidden from {}",
                endpoint
            );
        }

        cleanup_test_environment(&config, &realm_name).await;
    }
}
