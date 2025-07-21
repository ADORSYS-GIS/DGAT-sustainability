use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,                       // Keycloak user ID
    pub organizations: Organizations,      // Organizations with roles and metadata
    pub realm_access: Option<RealmAccess>, // Realm roles
    pub preferred_username: String,        // Username
    pub email: Option<String>,             // Email
    pub given_name: Option<String>,        // First name
    pub family_name: Option<String>,       // Last name
    pub exp: u64,                          // Expiration time
    pub iat: u64,                          // Issued at time
    pub aud: serde_json::Value,            // Audience
    pub iss: String,                       // Issuer
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organizations {
    #[serde(flatten)]
    pub orgs: HashMap<String, OrganizationInfo>, // Organization name -> Organization Info
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationInfo {
    pub id: Option<String>,
    pub categories: Vec<String>,
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
        self.has_role("organization_admin") || self.has_role("org_admin")
    }

    pub fn can_manage_organization(&self, organization_id: &str) -> bool {
        self.is_application_admin()
            || (self.is_organization_admin()
                && self.organizations.orgs.contains_key(organization_id))
    }

    /// Get the first organization ID (for backward compatibility)
    pub fn get_primary_organization_id(&self) -> Option<String> {
        self.organizations.orgs.keys().next().cloned()
    }

    /// Get the organization name (for backward compatibility)
    pub fn get_organization_name(&self) -> Option<String> {
        self.organizations.orgs.keys().next().cloned()
    }

    /// Get all organization IDs
    pub fn get_organization_ids(&self) -> Vec<String> {
        self.organizations.orgs.keys().cloned().collect()
    }

    /// Check if user has a specific role in a specific organization
    /// Note: Organization roles are no longer supported in the current JWT format
    pub fn has_organization_role(&self, _organization_id: &str, _role: &str) -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_organizations_serialization_deserialization() {
        // Test data matching the required format from the issue
        let test_json = json!({
            "sub": "user-123",
            "organizations": {
                "adorsys": {
                    "categories": [
                        "environment",
                        "social"
                    ]
                }
            },
            "preferred_username": "testuser",
            "exp": 1234567890_u64,
            "iat": 1234567890_u64,
            "aud": "test-audience",
            "iss": "test-issuer"
        });

        // Test deserialization
        let claims: Claims =
            serde_json::from_value(test_json).expect("Should deserialize successfully");

        // Test helper methods
        assert!(claims.get_primary_organization_id().is_some());
        assert_eq!(claims.get_organization_name(), Some("adorsys".to_string()));
        assert_eq!(claims.get_organization_ids().len(), 1);

        // Test organization role checking (should always return false in new format)
        let org_name = claims.get_primary_organization_id().unwrap();
        assert!(!claims.has_organization_role(&org_name, "any-role"));

        // Test serialization
        let serialized = serde_json::to_string(&claims).expect("Should serialize successfully");
        assert!(serialized.contains("organizations"));
        assert!(serialized.contains("adorsys"));
        assert!(serialized.contains("environment"));
        assert!(serialized.contains("social"));
    }
}
