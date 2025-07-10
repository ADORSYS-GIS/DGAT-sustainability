//! Request Logging Middleware
//!
//! This module provides middleware for logging all incoming HTTP requests
//! with detailed information including method, path, user info, response status, and duration.

use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{info, warn};

use crate::common::models::claims::Claims;

/// Request logging middleware that logs every incoming request
///
/// This middleware logs:
/// - HTTP method and path
/// - User information (if authenticated)
/// - Response status code
/// - Request duration
/// - Remote IP address (if available)
pub async fn request_logging_middleware(
    request: Request,
    next: Next,
) -> Response {
    let start_time = Instant::now();
    let method = request.method().clone();
    let uri = request.uri().clone();
    let path = uri.path();
    let query = uri.query().unwrap_or("");

    // Extract user information from claims if available
    let user_info = request.extensions().get::<Claims>().map(|claims| {
        format!(
            "user_id={}, username={}, org={}",
            claims.sub,
            claims.preferred_username,
            claims.get_organization_name().unwrap_or_else(|| "none".to_string())
        )
    });

    // Extract remote IP if available from headers
    let remote_ip = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|hv| hv.to_str().ok())
        .or_else(|| {
            request
                .headers()
                .get("x-real-ip")
                .and_then(|hv| hv.to_str().ok())
        })
        .unwrap_or("unknown");

    // Log the incoming request
    if let Some(ref user) = user_info {
        info!(
            method = %method,
            path = %path,
            query = %query,
            remote_ip = %remote_ip,
            user = %user,
            "Incoming request"
        );
    } else {
        info!(
            method = %method,
            path = %path,
            query = %query,
            remote_ip = %remote_ip,
            "Incoming request (unauthenticated)"
        );
    }

    // Process the request
    let response = next.run(request).await;

    // Calculate duration
    let duration = start_time.elapsed();
    let status = response.status();

    // Log the response
    if status.is_success() {
        if let Some(ref user) = user_info {
            info!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                user = %user,
                "Request completed successfully"
            );
        } else {
            info!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                "Request completed successfully (unauthenticated)"
            );
        }
    } else if status.is_client_error() {
        if let Some(ref user) = user_info {
            warn!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                user = %user,
                "Request failed with client error"
            );
        } else {
            warn!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                "Request failed with client error (unauthenticated)"
            );
        }
    } else if status.is_server_error() {
        if let Some(ref user) = user_info {
            warn!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                user = %user,
                "Request failed with server error"
            );
        } else {
            warn!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                "Request failed with server error (unauthenticated)"
            );
        }
    } else {
        // Other status codes (1xx, 3xx)
        if let Some(ref user) = user_info {
            info!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                user = %user,
                "Request completed"
            );
        } else {
            info!(
                method = %method,
                path = %path,
                status = %status.as_u16(),
                duration_ms = %duration.as_millis(),
                "Request completed (unauthenticated)"
            );
        }
    }

    response
}
