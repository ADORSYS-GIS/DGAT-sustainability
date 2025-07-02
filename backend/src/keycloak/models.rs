use serde::{Deserialize, Serialize};

/// Represents a new user to be created in Keycloak
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUser<'a> {
    /// Username for the new user
    pub username: &'a str,

    /// Email address for the new user
    pub email: &'a str,

    /// Password for the new user
    pub password: &'a str,

    /// First name of the user
    pub first_name: &'a str,

    /// Last name of the user
    pub last_name: &'a str,

    /// Organization ID to associate with the user
    pub organization_id: &'a str,

    /// Organization name to associate with the user
    pub organization_name: &'a str,

    /// Role to assign to the user
    pub role: &'a str,

    /// Group ID to add the user to
    pub group_id: &'a str,
}

/// Represents an organization to be created in Keycloak
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organization<'a> {
    /// Unique identifier for the organization
    pub id: &'a str,

    /// Name of the organization
    pub name: &'a str,

    /// Country where the organization is located
    pub country: &'a str,
}
