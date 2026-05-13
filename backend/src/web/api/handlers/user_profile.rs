use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
    extract::State,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::common::models::claims::Claims;
use crate::common::models::keycloak::CreateUserRequest;
use crate::web::routes::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    #[allow(dead_code)]
    pub current_password: String,
    pub new_password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confirm_password: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserProfileResponse {
    pub user_id: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub organizations: Option<serde_json::Value>,
    pub roles: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

pub async fn get_profile(
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<UserProfileResponse>> {
    Json(ApiResponse {
        success: true,
        message: None,
        data: Some(UserProfileResponse {
            user_id: claims.sub.clone(),
            username: Some(claims.preferred_username.clone()),
            email: claims.email.clone(),
            first_name: claims.given_name.clone(),
            last_name: claims.family_name.clone(),
            organizations: claims.organizations.as_ref().map(|orgs| {
                serde_json::to_value(&orgs.orgs).unwrap_or(serde_json::Value::Null)
            }),
            roles: claims.realm_access.as_ref().map(|r| r.roles.clone()).unwrap_or_default(),
        }),
    })
}

pub async fn update_profile(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Json(request): Json<UpdateProfileRequest>,
) -> Result<Json<ApiResponse<UserProfileResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let user_id = claims.sub.clone();
    let first_name = request.first_name.clone();
    let last_name = request.last_name.clone();
    let email = request.email.clone();
    
    info!(user_id = %user_id, "Updating user profile");
    
    let update_request = CreateUserRequest {
        username: String::new(),
        email: String::new(),
        first_name: request.first_name,
        last_name: request.last_name,
        email_verified: None,
        enabled: None,
        attributes: None,
        credentials: None,
        required_actions: None,
    };

    if let Err(e) = app_state
        .keycloak_service
        .update_user_attributes(&token, &user_id, &update_request)
        .await
    {
        error!("Failed to update user profile: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: Some("Failed to update profile. Please try again.".to_string()),
                data: None,
            }),
        ));
    }

    info!(user_id = %user_id, "Profile updated successfully");

    Ok(Json(ApiResponse {
        success: true,
        message: Some("Profile updated successfully".to_string()),
        data: Some(UserProfileResponse {
            user_id: claims.sub.clone(),
            username: Some(claims.preferred_username.clone()),
            email: email.or(claims.email.clone()),
            first_name: first_name.or(claims.given_name.clone()),
            last_name: last_name.or(claims.family_name.clone()),
            organizations: claims.organizations.as_ref().map(|orgs| {
                serde_json::to_value(&orgs.orgs).unwrap_or(serde_json::Value::Null)
            }),
            roles: claims.realm_access.as_ref().map(|r| r.roles.clone()).unwrap_or_default(),
        }),
    }))
}

pub async fn change_password(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Json(request): Json<ChangePasswordRequest>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let user_id = claims.sub.clone();
    
    info!(user_id = %user_id, "Processing password change request");

    if request.new_password != request.confirm_password.unwrap_or(request.new_password.clone()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: Some("Passwords do not match".to_string()),
                data: None,
            }),
        ));
    }

    if request.new_password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                message: Some("Password must be at least 8 characters long".to_string()),
                data: None,
            }),
        ));
    }

    if let Err(e) = app_state
        .keycloak_service
        .reset_user_password(&token, &user_id, &request.new_password)
        .await
    {
        error!("Failed to change password: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                message: Some("Failed to change password. Please try again.".to_string()),
                data: None,
            }),
        ));
    }

    info!(user_id = %user_id, "Password changed successfully");

    Ok(Json(ApiResponse {
        success: true,
        message: Some("Password changed successfully".to_string()),
        data: None,
    }))
}