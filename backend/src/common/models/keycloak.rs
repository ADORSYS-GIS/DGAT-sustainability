use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
    // You can add attributes or other fields as needed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakOrganizationMembership {
    pub id: String,
    pub member: KeycloakOrganizationMember,
    pub roles: Vec<String>,
    pub joined_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeycloakOrganizationMember {
    pub id: String,
    pub username: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
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
