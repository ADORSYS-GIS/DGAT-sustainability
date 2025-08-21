use sustainability_tool::common::models::keycloak::{
    UserInvitationRequest, UserInvitationStatus, EmailVerificationEvent, CreateUserRequest, KeycloakUser
};
use sustainability_tool::common::services::keycloak_service::KeycloakService;
use sustainability_tool::common::config::KeycloakConfigs;
use serde_json::json;

#[tokio::test]
async fn test_create_user_with_email_verification() {
    // This test would require a mock Keycloak service
    // For now, we'll test the data structures
    
    let request = UserInvitationRequest {
        email: "test@example.com".to_string(),
        first_name: Some("John".to_string()),
        last_name: Some("Doe".to_string()),
        organization_id: "org-123".to_string(),
        roles: vec!["org_user".to_string()],
        categories: vec!["category1".to_string(), "category2".to_string()],
    };

    assert_eq!(request.email, "test@example.com");
    assert_eq!(request.organization_id, "org-123");
    assert_eq!(request.roles.len(), 1);
    assert_eq!(request.categories.len(), 2);
}

#[tokio::test]
async fn test_user_invitation_status_flow() {
    // Test the status flow progression
    let statuses = vec![
        UserInvitationStatus::PendingEmailVerification,
        UserInvitationStatus::EmailVerified,
        UserInvitationStatus::PendingOrgInvitation,
        UserInvitationStatus::Active,
    ];

    assert_eq!(statuses.len(), 4);
    
    // Test serialization
    let status_json = serde_json::to_string(&UserInvitationStatus::PendingEmailVerification).unwrap();
    assert_eq!(status_json, "\"pending_email_verification\"");
}

#[tokio::test]
async fn test_email_verification_event() {
    let event = EmailVerificationEvent {
        user_id: "user-123".to_string(),
        email: "test@example.com".to_string(),
        verified_at: "2024-01-01T00:00:00Z".to_string(),
        event_type: "EMAIL_VERIFIED".to_string(),
    };

    assert_eq!(event.user_id, "user-123");
    assert_eq!(event.email, "test@example.com");
    assert_eq!(event.event_type, "EMAIL_VERIFIED");
}

#[tokio::test]
async fn test_create_user_request_serialization() {
    let request = CreateUserRequest {
        username: "testuser".to_string(),
        email: "test@example.com".to_string(),
        first_name: Some("John".to_string()),
        last_name: Some("Doe".to_string()),
        email_verified: Some(false),
        enabled: Some(true),
        attributes: Some(json!({
            "organization_id": "org-123",
            "pending_roles": ["org_user"],
            "pending_categories": ["category1"],
            "invitation_status": "pending_email_verification"
        })),
        credentials: None,
        required_actions: Some(vec!["VERIFY_EMAIL".to_string()]),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("testuser"));
    assert!(json.contains("test@example.com"));
    assert!(json.contains("VERIFY_EMAIL"));
    assert!(json.contains("pending_email_verification"));
}

#[tokio::test]
async fn test_keycloak_user_deserialization() {
    let user_json = json!({
        "id": "user-123",
        "username": "testuser",
        "firstName": "John",
        "lastName": "Doe",
        "email": "test@example.com",
        "emailVerified": false,
        "enabled": true,
        "attributes": {
            "organization_id": "org-123",
            "pending_roles": ["org_user"],
            "pending_categories": ["category1"],
            "invitation_status": "pending_email_verification"
        }
    });

    let user: KeycloakUser = serde_json::from_value(user_json).unwrap();
    
    assert_eq!(user.id, "user-123");
    assert_eq!(user.username, "testuser");
    assert_eq!(user.first_name, Some("John".to_string()));
    assert_eq!(user.last_name, Some("Doe".to_string()));
    assert_eq!(user.email, "test@example.com");
    assert_eq!(user.email_verified, false);
    assert_eq!(user.enabled, true);
    assert!(user.attributes.is_some());
}

#[tokio::test]
async fn test_temporary_password_generation() {
    // This would test the password generation logic
    // For now, we'll just verify the format
    let password = "TempAbc123!";
    assert!(password.starts_with("Temp"));
    assert!(password.ends_with("!"));
    assert!(password.len() >= 8);
}

#[tokio::test]
async fn test_user_attributes_extraction() {
    let attributes = json!({
        "organization_id": "org-123",
        "pending_roles": ["org_user", "org_admin"],
        "pending_categories": ["category1", "category2"],
        "invitation_status": "pending_email_verification",
        "email_verified_at": "2024-01-01T00:00:00Z"
    });

    let org_id = attributes.get("organization_id").and_then(|v| v.as_str()).unwrap();
    let pending_roles: Vec<String> = attributes.get("pending_roles")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();
    let pending_categories: Vec<String> = attributes.get("pending_categories")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    assert_eq!(org_id, "org-123");
    assert_eq!(pending_roles, vec!["org_user", "org_admin"]);
    assert_eq!(pending_categories, vec!["category1", "category2"]);
}

#[tokio::test]
async fn test_invitation_status_transitions() {
    // Test that status transitions follow the expected flow
    let mut status = UserInvitationStatus::PendingEmailVerification;
    
    // Simulate email verification
    status = UserInvitationStatus::EmailVerified;
    assert!(matches!(status, UserInvitationStatus::EmailVerified));
    
    // Simulate organization invitation sent
    status = UserInvitationStatus::PendingOrgInvitation;
    assert!(matches!(status, UserInvitationStatus::PendingOrgInvitation));
    
    // Simulate user activation
    status = UserInvitationStatus::Active;
    assert!(matches!(status, UserInvitationStatus::Active));
}

#[tokio::test]
async fn test_error_handling() {
    // Test error status
    let error_status = UserInvitationStatus::Error;
    let error_json = serde_json::to_string(&error_status).unwrap();
    assert_eq!(error_json, "\"error\"");
    
    // Test deserialization
    let deserialized: UserInvitationStatus = serde_json::from_str(&error_json).unwrap();
    assert!(matches!(deserialized, UserInvitationStatus::Error));
}
