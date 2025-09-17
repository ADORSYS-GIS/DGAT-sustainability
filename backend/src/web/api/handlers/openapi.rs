use axum::{response::IntoResponse, Json};
use std::fs;

#[axum::debug_handler]
pub async fn get_openapi_json() -> impl IntoResponse {
    match fs::read_to_string("docs/openapi.yaml") {
        Ok(content) => Json(content).into_response(),
        Err(_) => (axum::http::StatusCode::NOT_FOUND, "OpenAPI JSON not found").into_response(),
    }
}
