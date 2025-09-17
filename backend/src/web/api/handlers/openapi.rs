use axum::{response::IntoResponse, Json};
use serde_json::Value;
use std::fs;

#[axum::debug_handler]
pub async fn get_openapi_json() -> impl IntoResponse {
    match fs::read_to_string("docs/openapi.yaml") {
        Ok(content) => {
            // Parse YAML to serde_json::Value
            match serde_yaml::from_str::<Value>(&content) {
                Ok(value) => Json(value).into_response(), // ✅ No need for type annotation
                Err(e) => (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to parse YAML: {}", e)
                ).into_response(),
            }
        }
        Err(_) => (
            axum::http::StatusCode::NOT_FOUND,
            "OpenAPI file not found"
        ).into_response(),
    }
}
