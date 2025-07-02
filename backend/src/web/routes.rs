//! API Routes Configuration
//! 
//! This module defines the API routes and demonstrates how to properly configure
//! authentication and authorization middleware for different endpoints.

use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::web::handlers::{
    jwt_validator::JwtValidator,
    midlw::{auth_middleware, require_application_admin, require_organization_admin},
    organization_handlers::*,
    admin_client::keycloak::KeycloakAdminClient,
};

/// Application state containing shared services
#[derive(Clone)]
pub struct AppState {
    pub jwt_validator: Arc<Mutex<JwtValidator>>,
    pub keycloak_client: Arc<Mutex<KeycloakAdminClient>>,
}

impl AppState {
    pub fn new(
        keycloak_url: String,
        realm: String,
        client_id: String,
        client_secret: String,
    ) -> Self {
        let jwt_validator = Arc::new(Mutex::new(
            JwtValidator::new(keycloak_url.clone(), realm.clone())
        ));
        
        let keycloak_client = Arc::new(Mutex::new(
            KeycloakAdminClient::new(keycloak_url, realm, client_id, client_secret)
        ));

        Self {
            jwt_validator,
            keycloak_client,
        }
    }
}

/// Create the main application router with all routes and middleware
pub fn create_router(app_state: AppState) -> Router {
    Router::new()
        .merge(organization_routes())
        .merge(user_routes())
        .merge(admin_routes())
        // Apply authentication middleware to all routes
        .layer(middleware::from_fn_with_state(
            app_state.jwt_validator.clone(),
            auth_middleware,
        ))
        .with_state(app_state.keycloak_client)
}

/// Organization management routes
/// 
/// These routes handle CRUD operations for organizations with proper authorization:
/// - GET /organizations - List organizations (filtered by role)
/// - POST /organizations - Create organization (application_admin only)
/// - GET /organizations/:id - Get organization details
/// - PUT /organizations/:id - Update organization
/// - DELETE /organizations/:id - Delete organization (application_admin only)
fn organization_routes() -> Router<Arc<Mutex<KeycloakAdminClient>>> {
    Router::new()
        .route("/organizations", get(list_organizations))
        .route(
            "/organizations",
            post(create_organization)
                .layer(middleware::from_fn(require_application_admin())),
        )
        .route("/organizations/:id", get(get_organization))
        .route("/organizations/:id", put(update_organization))
        .route(
            "/organizations/:id",
            delete(delete_organization)
                .layer(middleware::from_fn(require_application_admin())),
        )
}

/// User management routes
/// 
/// These routes handle user operations within organizations:
/// - GET /organizations/:id/users - List users in organization
/// - POST /organizations/:id/users - Create user in organization
/// - GET /users/:id - Get user details
/// - DELETE /users/:id - Delete user
fn user_routes() -> Router<Arc<Mutex<KeycloakAdminClient>>> {
    Router::new()
        .route("/organizations/:id/users", get(list_organization_users))
        .route("/organizations/:id/users", post(create_user))
        .route("/users/:id", get(get_user))
        .route("/users/:id", delete(delete_user))
}

/// Administrative routes
/// 
/// These routes are for application-level administration:
/// - POST /admin/organization-admins - Create organization admin (application_admin only)
fn admin_routes() -> Router<Arc<Mutex<KeycloakAdminClient>>> {
    Router::new()
        .route(
            "/admin/organization-admins",
            post(create_organization_admin)
                .layer(middleware::from_fn(require_application_admin())),
        )
}

/// Health check route (no authentication required)
pub fn health_routes() -> Router {
    use axum::Json;
    use serde_json::json;

    async fn health_check() -> Json<serde_json::Value> {
        Json(json!({
            "status": "healthy",
            "service": "sustainability-backend",
            "timestamp": chrono::Utc::now().to_rfc3339()
        }))
    }

    Router::new().route("/health", get(health_check))
}

/// Create the complete application with all routes
pub fn create_app(app_state: AppState) -> Router {
    Router::new()
        .nest("/api/v1", create_router(app_state))
        .merge(health_routes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_endpoint() {
        let app = health_routes();
        
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/health")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_protected_route_without_auth() {
        let app_state = AppState::new(
            "http://localhost:8080".to_string(),
            "test-realm".to_string(),
            "test-client".to_string(),
            "test-secret".to_string(),
        );
        
        let app = create_router(app_state);
        
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/organizations")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}