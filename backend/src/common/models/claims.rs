use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,                          // Keycloak user ID
    pub organization_id: Option<String>,      // Organization UUID
    pub organization_name: Option<String>,    // Organization name
    pub realm_access: Option<RealmAccess>,    // Realm roles
    pub preferred_username: String,           // Username
    pub email: Option<String>,                // Email
    pub given_name: Option<String>,           // First name
    pub family_name: Option<String>,          // Last name
    pub exp: u64,                            // Expiration time
    pub iat: u64,                            // Issued at time
    pub aud: serde_json::Value,              // Audience
    pub iss: String,                         // Issuer
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealmAccess {
    pub roles: Vec<String>,
}

impl Claims {
    pub fn has_role(&self, role: &str) -> bool {
        self.realm_access
            .as_ref()
            .map(|access| access.roles.contains(&role.to_string()))
            .unwrap_or(false)
    }

    pub fn is_application_admin(&self) -> bool {
        self.has_role("application_admin")
    }

    pub fn is_organization_admin(&self) -> bool {
        self.has_role("organization_admin")
    }

    pub fn can_manage_organization(&self, organization_id: &str) -> bool {
        self.is_application_admin() ||
            (self.is_organization_admin() &&
                self.organization_id.as_ref() == Some(&organization_id.to_string()))
    }
}