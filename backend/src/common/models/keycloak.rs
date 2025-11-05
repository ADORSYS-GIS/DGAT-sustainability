use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakToken {
    pub access_token: String,
    pub expires_in: i32,
    pub refresh_expires_in: i32,
    pub refresh_token: String,
    pub token_type: String,
    pub not_before_policy: Option<i32>,
    pub session_state: Option<String>,
    pub scope: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationDomain {
    pub name: String,
    pub verified: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakOrganization {
    pub id: String,
    pub name: String,
    pub alias: Option<String>,
    pub enabled: bool,
    pub description: Option<String>,
    #[serde(rename = "redirectUrl")]
    pub redirect_url: Option<String>,
    pub domains: Option<Vec<OrganizationDomain>>,
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KeycloakOrganizationMember {
    pub id: String,
    pub username: String,
    #[serde(rename = "firstName", default)]
    pub first_name: Option<String>,
    #[serde(rename = "lastName", default)]
    pub last_name: Option<String>,
    pub email: String,
    #[serde(rename = "emailVerified", default)]
    pub email_verified: bool,
    #[serde(default)]
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakInvitation {
    pub id: String,
    pub email: String,
    pub invited_at: String,
    pub expiration: Option<String>,
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakInvitationRequest {
    pub email: String,
    pub roles: Vec<String>,
    pub expiration: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakRoleAssignment {
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakUser {
    pub id: String,
    pub username: String,
    #[serde(rename = "firstName", default)]
    pub first_name: Option<String>,
    #[serde(rename = "lastName", default)]
    pub last_name: Option<String>,
    pub email: String,
    #[serde(rename = "emailVerified", default)]
    pub email_verified: bool,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub attributes: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    #[serde(rename = "firstName")]
    pub first_name: Option<String>,
    #[serde(rename = "lastName")]
    pub last_name: Option<String>,
    #[serde(rename = "emailVerified")]
    pub email_verified: Option<bool>,
    pub enabled: Option<bool>,
    pub attributes: Option<serde_json::Value>,
    pub credentials: Option<Vec<KeycloakCredential>>,
    #[serde(rename = "requiredActions")]
    pub required_actions: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakCredential {
    #[serde(rename = "type")]
    pub credential_type: String,
    pub value: String,
    pub temporary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInvitationRequest {
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub organization_id: String,
    pub roles: Vec<String>,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInvitationResponse {
    pub user_id: String,
    pub email: String,
    pub status: UserInvitationStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserInvitationStatus {
    #[serde(rename = "pending_email_verification")]
    PendingEmailVerification,
    #[serde(rename = "email_verified")]
    EmailVerified,
    #[serde(rename = "pending_org_invitation")]
    PendingOrgInvitation,
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "error")]
    Error,
}


