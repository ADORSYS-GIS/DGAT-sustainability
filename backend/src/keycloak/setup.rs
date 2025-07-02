use super::admin::KeycloakAdmin;
use super::models::{NewUser, Organization};
use thiserror::Error;
use tracing::{error, info};
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum SetupError {
    #[error("Keycloak admin error: {0}")]
    KeycloakAdminError(#[from] super::admin::KeycloakAdminError),
}

pub async fn setup_keycloak() -> Result<(), SetupError> {
    let keycloak_url =
        std::env::var("KEYCLOAK_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
    let admin_username = std::env::var("KEYCLOAK_ADMIN").unwrap_or_else(|_| "admin".to_string());
    let admin_password =
        std::env::var("KEYCLOAK_ADMIN_PASSWORD").unwrap_or_else(|_| "admin123".to_string());
    let realm_name =
        std::env::var("KEYCLOAK_REALM").unwrap_or_else(|_| "sustainability_realm".to_string());

    info!("Setting up Keycloak with realm: {}", realm_name);

    let mut admin = KeycloakAdmin::new(
        keycloak_url.clone(),
        realm_name.clone(),
        admin_username,
        admin_password,
    );

    // Create realm if it doesn't exist
    let created = admin.create_realm_if_not_exists(&realm_name).await?;
    if created {
        info!("Created new realm: {}", realm_name);
    } else {
        info!("Using existing realm: {}", realm_name);
    }

    // Create client
    let client_id = "sustainability_client";
    let client_name = "Sustainability Assessment Tool";
    let redirect_uris = vec!["http://localhost:3000/*", "http://localhost:3001/*"];
    let web_origins = vec!["*"];

    admin
        .create_client_if_not_exists(client_id, client_name, redirect_uris, web_origins)
        .await?;

    // Create roles
    let roles = ["application_admin", "organization_admin", "user"];
    for role in roles.iter() {
        admin.create_role_if_not_exists(role).await?;
    }

    // Create organizations group structure
    let org_group_id = admin.create_organizations_group().await?;

    // Create test organization
    let test_org_id = Uuid::new_v4().to_string();
    let test_org_name = "Test Organization";
    let test_org_country = "Test Country";

    let test_organization = Organization {
        id: &test_org_id,
        name: test_org_name,
        country: test_org_country,
    };

    let test_org_group_id = admin
        .create_organization_subgroup(&org_group_id, &test_organization)
        .await?;

    // Create client protocol mappers
    admin.create_client_mappers(client_id).await?;

    // Create test user
    let test_user = NewUser {
        username: "test_user",
        email: "test@example.com",
        password: "test_password",
        first_name: "Test",
        last_name: "User",
        organization_id: &test_org_id,
        organization_name: test_org_name,
        role: "organization_admin",
        group_id: &test_org_group_id,
    };

    let test_user_id = admin.create_test_user(&test_user).await?;

    info!("Keycloak setup completed successfully");
    info!("Test user created with ID: {}", test_user_id);

    Ok(())
}
