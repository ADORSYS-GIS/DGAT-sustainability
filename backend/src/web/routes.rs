//! API Routes Configuration
//!
//! This module defines the API routes for a resource server that validates JWT tokens
//! and serves protected resources based on user roles and organization membership.
//!
//! As a resource server, this backend:
//! - Validates JWT tokens from Keycloak
//! - Extracts user claims and organization information
//! - Protects API endpoints based on roles and organization membership
//! - Serves business logic endpoints (not user/organization management)
//!
//! User and organization management should be handled by the frontend through Keycloak's
//! admin console or APIs directly.

use axum::http::HeaderValue;
use axum::{
    extract::Extension, http::StatusCode, middleware, response::Json, routing::get, Router,
};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

use crate::common::cache::SessionCache;
use crate::common::config::{Configs, KeycloakConfigs};
use crate::common::models::claims::Claims;
use crate::common::services::keycloak_service::KeycloakService;
use crate::common::state::AppDatabase;
use crate::web::api::routes::create_router;
use crate::web::handlers::{
    jwt_validator::JwtValidator, midlw::auth_middleware,
    request_logging::request_logging_middleware,
};

/// Application state containing shared services for JWT validation and database access
#[derive(Clone)]
pub struct AppState {
    pub jwt_validator: Arc<Mutex<JwtValidator>>,
    pub database: AppDatabase,
    pub keycloak_service: Arc<KeycloakService>,
    pub session_cache: SessionCache,
}

impl AppState {
    pub async fn new(keycloak_url: String, realm: String, database: AppDatabase) -> Self {
        let jwt_validator = Arc::new(Mutex::new(JwtValidator::new(
            keycloak_url.clone(),
            realm.clone(),
        )));
        let keycloak_config = KeycloakConfigs {
            url: keycloak_url,
            realm,
        };
        let keycloak_service = Arc::new(KeycloakService::new(keycloak_config));

        Self {
            jwt_validator,
            database,
            keycloak_service,
            session_cache: SessionCache::new(),
        }
    }
}

/// Create the main application router with protected routes
pub fn routers(app_state: AppState) -> Router {
    Router::new()
        .merge(protected_routes())
        .merge(create_router(app_state.clone()))
        // Apply authentication middleware to all protected routes
        .layer(middleware::from_fn_with_state(
            app_state.jwt_validator.clone(),
            auth_middleware,
        ))
}

/// Protected routes that require JWT authentication
///
/// These routes demonstrate how to create protected endpoints that:
/// - Require valid JWT tokens
/// - Extract user claims and organization information
/// - Can be extended with business logic
fn protected_routes() -> Router {
    Router::new()
        .route("/user/profile", get(get_user_profile))
        .route("/user/organizations", get(get_user_organizations))
        .route("/protected/resource", get(get_protected_resource))
}

/// Get current user profile from JWT claims
///
/// This endpoint demonstrates how to extract user information from validated JWT tokens
async fn get_user_profile(Extension(claims): Extension<Claims>) -> Json<serde_json::Value> {
    Json(json!({
        "user_id": claims.sub,
        "username": claims.preferred_username,
        "email": claims.email,
        "first_name": claims.given_name,
        "last_name": claims.family_name,
        "organizations": claims.organizations,
        "roles": claims.realm_access.as_ref().map(|r| &r.roles).unwrap_or(&vec![])
    }))
}

/// Get user's organization information
///
/// This endpoint shows how to provide organization-specific data based on JWT claims
async fn get_user_organizations(
    Extension(claims): Extension<Claims>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if let (Some(org_id), Some(org_name)) = (
        claims.get_primary_organization_id(),
        claims.get_organization_name(),
    ) {
        Ok(Json(json!({
            "organization": {
                "id": org_id,
                "name": org_name,
                "user_role": if claims.is_application_admin() {
                    "application_admin"
                } else if claims.is_organization_admin() {
                    "organization_admin"
                } else {
                    "user"
                }
            }
        })))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

/// Example protected resource endpoint
///
/// This demonstrates a business logic endpoint that requires authentication
/// and can be extended with actual application functionality
async fn get_protected_resource(Extension(claims): Extension<Claims>) -> Json<serde_json::Value> {
    Json(json!({
        "message": "This is a protected resource",
        "accessed_by": claims.preferred_username,
        "organization": claims.get_organization_name(),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Health check route (no authentication required)
pub fn health_routes() -> Router {
    async fn health_check() -> Json<serde_json::Value> {
        Json(json!({
            "status": "healthy",
            "service": "sustainability-resource-server",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "version": env!("CARGO_PKG_VERSION")
        }))
    }

    Router::new().route("/health", get(health_check))
}

/// Create the complete application with all routes
pub fn create_app(app_state: AppState, config: Configs) -> Router {
    // Configure CORS
    let origin = HeaderValue::from_str(&config.cors.origin).unwrap();
    let cors = CorsLayer::new()
        .allow_origin(origin)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .merge(routers(app_state.clone()))
        .merge(health_routes())
        .layer(cors)
        .layer(middleware::from_fn(request_logging_middleware))
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
        // Create a mock database connection for testing
        let db = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        let app_database = AppDatabase::new(std::sync::Arc::new(db)).await;

        let app_state = AppState::new(
            "http://localhost:8080".to_string(),
            "test-realm".to_string(),
            app_database,
        )
        .await;

        let app = routers(app_state);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/user/profile")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_api_route_without_auth() {
        // Create a mock database connection for testing
        let db = sea_orm::Database::connect("sqlite::memory:").await.unwrap();
        let app_database = AppDatabase::new(std::sync::Arc::new(db)).await;

        let app_state = AppState::new(
            "http://localhost:8080".to_string(),
            "test-realm".to_string(),
            app_database,
        )
        .await;

        let config = crate::common::config::Configs {
            keycloak: crate::common::config::KeycloakConfigs {
                url: "http://localhost:8080".to_string(),
                realm: "test-realm".to_string(),
            },
            server: crate::common::config::ServerConfigs {
                host: "0.0.0.0".to_string(),
                port: 3001,
            },
            cors: crate::common::config::CorsConfigs {
                origin: "http://localhost:3000".to_string(),
            },
        };

        let app = create_app(app_state, config);

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/assessments")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        // This should return UNAUTHORIZED if auth middleware is working
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
