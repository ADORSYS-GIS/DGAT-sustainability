use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationRequest {
    pub name: String,
    pub description: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserRequest {
    pub username: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub organization_id: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub organization_id: String,
}