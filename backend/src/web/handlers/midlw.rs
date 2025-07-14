//! Authentication and Authorization Middleware
//!
//! This module provides middleware for JWT token validation and role-based access control.
//! It integrates with Keycloak for token validation and provides utilities for
//! enforcing role-based permissions.

use std::collections::HashMap;
use crate::common::models::claims::{Claims, Organizations};
use crate::web::handlers::jwt_validator::JwtValidator;
use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Main authentication middleware that validates JWT tokens and injects claims
///
/// This middleware:
/// 1. Extracts the Bearer token from the Authorization header
/// 2. Validates the token using Keycloak public keys
/// 3. Injects the validated claims into the request for downstream handlers
pub async fn auth_middleware(
    State(jwt_validator): State<Arc<Mutex<JwtValidator>>>,
    headers: HeaderMap,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract Authorization header
    let auth_header = headers.get("Authorization").ok_or_else(|| {
        tracing::warn!("Missing Authorization header");
        StatusCode::UNAUTHORIZED
    })?;

    let token = auth_header
        .to_str()
        .map_err(|e| {
            tracing::warn!("Invalid Authorization header format: {}", e);
            StatusCode::UNAUTHORIZED
        })?
        .strip_prefix("Bearer ")
        .ok_or_else(|| {
            tracing::warn!("Authorization header missing Bearer prefix");
            StatusCode::UNAUTHORIZED
        })?;

    // Validate token
    let validator = jwt_validator.lock().await;
    let claims = validator.validate_token(token).await.map_err(|e| {
        tracing::error!("Token validation failed: {}", e);
        StatusCode::UNAUTHORIZED
    })?;

    // Log successful authentication
    tracing::debug!(
        "User authenticated: {} (org: {:?})",
        claims.preferred_username,
        claims.get_primary_organization_id()
    );

    // Add claims to request extensions
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

/// Role-based authorization middleware factory
///
/// Creates middleware that requires a specific role to access the endpoint.
/// Must be used after auth_middleware to ensure claims are available.
pub fn require_role(
    required_role: &'static str,
) -> impl Fn(
    Request,
    Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>,
> + Clone {
    move |request: Request, next: Next| {
        Box::pin(async move {
            let claims = request.extensions().get::<Claims>().ok_or_else(|| {
                tracing::error!(
                    "Claims not found in request - auth_middleware must be applied first"
                );
                StatusCode::UNAUTHORIZED
            })?;

            if !claims.has_role(required_role) {
                tracing::warn!(
                    "User {} lacks required role '{}' (has roles: {:?})",
                    claims.preferred_username,
                    required_role,
                    claims.realm_access.as_ref().map(|r| &r.roles)
                );
                return Err(StatusCode::FORBIDDEN);
            }

            tracing::debug!(
                "User {} authorized with role '{}'",
                claims.preferred_username,
                required_role
            );

            Ok(next.run(request).await)
        })
    }
}

/// Middleware that requires application_admin role
pub fn require_application_admin() -> impl Fn(
    Request,
    Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>,
> + Clone {
    move |request: Request, next: Next| {
        Box::pin(async move {
            let claims = request.extensions().get::<Claims>().ok_or_else(|| {
                tracing::error!(
                    "Claims not found in request - auth_middleware must be applied first"
                );
                StatusCode::UNAUTHORIZED
            })?;

            if !claims.is_application_admin() {
                tracing::warn!(
                    "User {} is not an application admin",
                    claims.preferred_username
                );
                return Err(StatusCode::FORBIDDEN);
            }

            Ok(next.run(request).await)
        })
    }
}

/// Middleware that requires organization_admin role or application_admin role
pub fn require_organization_admin() -> impl Fn(
    Request,
    Next,
) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<Response, StatusCode>> + Send>,
> + Clone {
    move |request: Request, next: Next| {
        Box::pin(async move {
            let claims = request.extensions().get::<Claims>().ok_or_else(|| {
                tracing::error!(
                    "Claims not found in request - auth_middleware must be applied first"
                );
                StatusCode::UNAUTHORIZED
            })?;

            if !claims.is_organization_admin() && !claims.is_application_admin() {
                tracing::warn!(
                    "User {} is neither organization admin nor application admin",
                    claims.preferred_username
                );
                return Err(StatusCode::FORBIDDEN);
            }

            Ok(next.run(request).await)
        })
    }
}

/// Utility function to extract claims from request
///
/// This is a helper function for handlers that need to access user claims.
pub fn get_claims_from_request(request: &Request) -> Option<&Claims> {
    request.extensions().get::<Claims>()
}
