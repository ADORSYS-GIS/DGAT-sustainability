use axum::{response::IntoResponse, Json};
use serde_json::Value;
use std::fs;
use std::env;

#[axum::debug_handler]
pub async fn get_openapi_json() -> impl IntoResponse {
    let mut spec = match fs::read_to_string("docs/openapi.yaml") {
        Ok(content) => match serde_yaml::from_str::<Value>(&content) {
            Ok(value) => value,
            Err(e) => return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to parse YAML: {}", e)
            ).into_response(),
        },
        Err(_) => return (
            axum::http::StatusCode::NOT_FOUND,
            "OpenAPI file not found"
        ).into_response(),
    };

    let server_address = env::var("SERVER_ADDRESS").unwrap_or_else(|_| "https://localhost".to_string());
    spec["servers"] = serde_json::json!([{
        "url": server_address,
        "description": "Dynamic server address from environment"
    }]);

    Json(spec).into_response()
}
