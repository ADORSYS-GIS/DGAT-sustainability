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

    // Extract user information from claims if available (redacted in production logs)
    let user_info = request.extensions().get::<Claims>().map(|_claims| {
        "[redacted user info]".to_string()
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
    // Production: Don't log user details
    info!(
        method = %method,
        path = %path,
        query = %query,
        remote_ip = %remote_ip,
        "Incoming request"
    );

    // Process the request
    let response = next.run(request).await;

    // Calculate duration
    let duration = start_time.elapsed();
    let status = response.status();

    // Log the response (generic, production safe)
    if status.is_success() {
        info!(
            method = %method,
            path = %path,
            status = %status.as_u16(),
            duration_ms = %duration.as_millis(),
            "Request completed successfully"
        );
    } else if status.is_client_error() {
        warn!(
            method = %method,
            path = %path,
            status = %status.as_u16(),
            duration_ms = %duration.as_millis(),
            "Request failed with client error"
        );
    } else if status.is_server_error() {
        warn!(
            method = %method,
            path = %path,
            status = %status.as_u16(),
            duration_ms = %duration.as_millis(),
            "Request failed with server error"
        );
    } else {
        // Other status codes (1xx, 3xx)
        info!(
            method = %method,
            path = %path,
            status = %status.as_u16(),
            duration_ms = %duration.as_millis(),
            "Request completed"
        );
    }

    response
}
