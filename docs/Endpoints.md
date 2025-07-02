## 🔍 API Endpoints

### Health Check
- `GET /health` - System health status (no auth required)

### Organization Management
- `GET /api/v1/organizations` - List organizations (filtered by role)
- `POST /api/v1/organizations` - Create organization (application_admin only)
- `GET /api/v1/organizations/{id}` - Get organization details
- `PUT /api/v1/organizations/{id}` - Update organization
- `DELETE /api/v1/organizations/{id}` - Delete organization (application_admin only)

### User Management
- `GET /api/v1/organizations/{id}/users` - List users in organization
- `POST /api/v1/organizations/{id}/users` - Create user in organization
- `GET /api/v1/users/{id}` - Get user details
- `DELETE /api/v1/users/{id}` - Delete user

### Administrative Operations
- `POST /api/v1/admin/organization-admins` - Create organization admin (application_admin only)
