use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    NotFound(String),
    Forbidden(String),
    Conflict(String),
    InternalServerError(String),
    DatabaseError(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ApiError::BadRequest(message) => (StatusCode::BAD_REQUEST, message),
            ApiError::NotFound(message) => (StatusCode::NOT_FOUND, message),
            ApiError::Conflict(message) => (StatusCode::CONFLICT, message),
            ApiError::Forbidden(message) => (StatusCode::FORBIDDEN, message),
            ApiError::InternalServerError(message) => (StatusCode::INTERNAL_SERVER_ERROR, message),
            ApiError::DatabaseError(message) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {message}"),
            ),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

impl From<sea_orm::DbErr> for ApiError {
    fn from(err: sea_orm::DbErr) -> Self {
        ApiError::DatabaseError(err.to_string())
    }
}
