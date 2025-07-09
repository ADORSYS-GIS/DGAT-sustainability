## 🔍 API Endpoints

### Health Check
- `GET /health` - System health status (no auth required)

### User Profile & Authentication
- `GET /api/v1/user/profile` - Get current user profile from JWT claims (auth required)
- `GET /api/v1/user/organizations` - Get user's organization information (auth required)

### Protected Resources
- `GET /api/v1/protected/resource` - Example protected resource endpoint (auth required)

## 🔐 Authentication

All API endpoints (except `/health`) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

The JWT token should contain:
- User information (sub, preferred_username, email, etc.)
- Organizations structure with roles and metadata
- Realm access roles

## 📋 Response Format

### User Profile Response
```json
{
  "user_id": "user-uuid",
  "username": "username",
  "email": "user@example.com",
  "first_name": "First",
  "last_name": "Last",
  "organizations": {
    "org-uuid": {
      "roles": ["manage-organization", "view-members"]
    },
    "name": "Organization Name",
    "categories": ["social", "environment"]
  },
  "roles": ["organization_admin"]
}
```

### User Organizations Response
```json
{
  "organization": {
    "id": "org-uuid",
    "name": "Organization Name",
    "user_role": "organization_admin"
  }
}
```

## 🏗️ Architecture Notes

This backend serves as a **resource server** that:
- Validates JWT tokens from Keycloak
- Extracts user claims and organization information  
- Protects API endpoints based on roles and organization membership
- Serves business logic endpoints

User and organization management should be handled by the frontend through Keycloak's admin console or APIs directly.
