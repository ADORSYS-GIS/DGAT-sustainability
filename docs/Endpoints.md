## 🔍 API Endpoints

### Health & Monitoring
- `GET /health` - System health status (no auth required)
- `GET /api/health` - API health check (auth required)
- `GET /api/metrics` - Basic service metrics (auth required)

### API Documentation
- `GET /api/openapi.json` - OpenAPI specification (no auth required)

### User Profile & Authentication
- `GET /user/profile` - Get current user profile from JWT claims (auth required)
- `GET /user/organizations` - Get user's organization information (auth required)

### Protected Resources
- `GET /protected/resource` - Example protected resource endpoint (auth required)

### Organizations Management
- `GET /api/admin/organizations` - List all organizations (admin auth required)
- `POST /api/admin/organizations` - Create a new organization (admin auth required)
- `GET /admin/realms/:realm/organizations/count` - Get organization count (admin auth required)
- `GET /admin/realms/:member_id/organizations` - Get member organizations (admin auth required)
- `GET /admin/realms/:realm/organizations/:org_id` - Get organization details (admin auth required)
- `PUT /api/admin/organizations/:org_id` - Update organization (admin auth required)
- `DELETE /api/admin/organizations/:org_id` - Delete organization (admin auth required)

### Organization Identity Providers
- `GET /admin/realms/:realm/organizations/:org_id/identity-providers` - List identity providers (admin auth required)
- `POST /admin/realms/:realm/organizations/:org_id/identity-providers` - Add identity provider (admin auth required)
- `GET /admin/realms/:realm/organizations/:org_id/identity-providers/:alias` - Get identity provider (admin auth required)
- `DELETE /admin/realms/:realm/organizations/:org_id/identity-providers/:alias` - Remove identity provider (admin auth required)

### Organization Members
- `GET /api/organizations/:org_id/members` - List organization members (org admin auth required)
- `POST /api/organizations/:org_id/members` - Add member to organization (org admin auth required)
- `GET /admin/realms/:realm/organizations/:org_id/members/count` - Get member count (admin auth required)
- `POST /admin/realms/:realm/organizations/:org_id/members/invite-existing-user` - Invite existing user (admin auth required)
- `POST /admin/realms/:realm/organizations/:org_id/members/invite-user` - Invite new user (admin auth required)
- `GET /admin/realms/:realm/organizations/:org_id/members/:member_id` - Get member details (admin auth required)
- `DELETE /api/admin/organizations/:org_id/members/:member_id` - Remove member (admin auth required)
- `GET /admin/realms/:realm/organizations/:org_id/members/:member_id/organizations` - Get member organizations (admin auth required)

### Organization Admin Members
- `POST /api/organizations/:org_id/org-admin/members` - Add org admin member (org admin auth required)
- `GET /api/organizations/:org_id/org-admin/members` - List org admin members (org admin auth required)
- `DELETE /api/organizations/:org_id/org-admin/members/:member_id` - Remove org admin member (org admin auth required)
- `PUT /api/organizations/:org_id/org-admin/members/:member_id/categories` - Update org admin member categories (org admin auth required)

### Questions Management
- `GET /api/questions` - List all questions (auth required)
- `POST /api/questions` - Create a new question (admin auth required)
- `GET /api/questions/:question_id` - Get question details (auth required)
- `PUT /api/questions/:question_id` - Update question (admin auth required)
- `DELETE /api/questions/revisions/:revision_id` - Delete question revision (admin auth required)

### Categories Management
- `GET /api/categories` - List all categories (auth required)
- `POST /api/categories` - Create a new category (admin auth required)
- `GET /api/categories/:category_id` - Get category details (auth required)
- `PUT /api/categories/:category_id` - Update category (admin auth required)
- `DELETE /api/categories/:category_id` - Delete category (admin auth required)

### Category Catalogs
- `GET /api/category-catalog` - List all active category catalogs (auth required)
- `POST /api/category-catalog` - Create a new category catalog (admin auth required)
- `DELETE /api/category-catalog/:category_catalog_id` - Delete category catalog (admin auth required)

### Organization Categories
- `GET /api/organizations/:keycloak_organization_id/categories` - Get organization categories (auth required)
- `POST /api/organizations/:keycloak_organization_id/categories/assign` - Assign categories to organization (org admin auth required)
- `PUT /api/organizations/:keycloak_organization_id/categories/:organization_category_id` - Update organization category (org admin auth required)

### Assessments
- `GET /api/assessments` - List assessments for current org (auth required)
- `POST /api/assessments` - Create a new assessment (org admin auth required)
- `GET /api/assessments/:assessment_id` - Get assessment details (auth required)
- `PUT /api/assessments/:assessment_id` - Update assessment (org admin auth required)
- `DELETE /api/assessments/:assessment_id` - Delete assessment (org admin auth required)
- `POST /api/assessments/:assessment_id/submit` - Submit assessment for review (auth required)
- `POST /api/assessments/:assessment_id/draft` - Save assessment as draft (auth required)

### Responses
- `GET /api/assessments/:assessment_id/responses` - List responses for assessment (auth required)
- `POST /api/assessments/:assessment_id/responses` - Create/update responses (auth required)
- `GET /api/assessments/:assessment_id/responses/:response_id` - Get response details (auth required)
- `PUT /api/assessments/:assessment_id/responses/:response_id` - Update response (auth required)
- `DELETE /api/assessments/:assessment_id/responses/:response_id` - Delete response (auth required)

### File Management
- `POST /api/files` - Upload a file (auth required)
- `GET /api/files/:file_id` - Download a file (auth required)
- `DELETE /api/files/:file_id` - Delete a file (auth required)
- `GET /api/files/:file_id/metadata` - Get file metadata (auth required)
- `POST /api/assessments/:assessment_id/responses/:response_id/files` - Attach file to response (auth required)
- `DELETE /api/assessments/:assessment_id/responses/:response_id/files/:file_id` - Remove file from response (auth required)

### Submissions
- `GET /api/submissions` - List user submissions (auth required)
- `GET /api/org_admin/submissions` - List org admin submissions (org admin auth required)
- `GET /api/submissions/:submission_id` - Get submission details (auth required)
- `DELETE /api/submissions/:submission_id` - Delete submission (auth required)

### Reports
- `GET /api/user/reports` - List user reports (auth required)
- `GET /api/submissions/:submission_id/reports` - List reports for submission (auth required)
- `POST /api/submissions/:submission_id/reports` - Generate new report (auth required)
- `GET /api/reports/:report_id` - Get report details (auth required)
- `DELETE /api/reports/:report_id` - Delete report (auth required)
- `PUT /api/reports/:report_id/recommendations/:category/status` - Update recommendation status (org admin auth required)

### Admin Functions
- `GET /api/admin/submissions` - List all submissions (admin auth required)
- `GET /api/drafts` - List temp submissions by assessment (admin auth required)
- `GET /api/admin/action-plans` - List all action plans (admin auth required)
- `GET /api/admin/reports` - List all reports (admin auth required)

### User Management
- `POST /api/admin/user-invitations` - Create user invitation (admin auth required)
- `GET /api/admin/user-invitations/:user_id/status` - Get user invitation status (admin auth required)
- `DELETE /api/admin/users/:user_id` - Delete user (admin auth required)

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

### Assessment Response
```json
{
  "assessment": {
    "assessment_id": "uuid",
    "org_id": "org-uuid",
    "language": "en",
    "name": "Assessment Name",
    "categories": ["social", "environment"],
    "status": "draft",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Question Response
```json
{
  "question": {
    "question_id": "uuid",
    "category": "social",
    "text": {
      "en": "Question text in English",
      "de": "Question text in German"
    },
    "weight": 1.0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### File Upload Response
```json
{
  "file": {
    "file_id": "uuid",
    "filename": "document.pdf",
    "size": 1024,
    "content_type": "application/pdf",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Submission Response
```json
{
  "submission": {
    "submission_id": "uuid",
    "org_id": "org-uuid",
    "assessment_name": "Assessment Name",
    "content": {},
    "submitted_at": "2024-01-01T00:00:00Z",
    "review_status": "pending"
  }
}
```

### Report Response
```json
{
  "report": {
    "report_id": "uuid",
    "submission_id": "uuid",
    "status": "completed",
    "generated_at": "2024-01-01T00:00:00Z",
    "data": {}
  }
}
```

## 📝 Request Parameters

### Query Parameters
Many endpoints support query parameters for filtering and pagination:

#### Organizations Query Parameters
- `briefRepresentation` (boolean) - Return brief representation
- `exact` (boolean) - Exact match search
- `first` (integer) - First result index for pagination
- `max` (integer) - Maximum number of results
- `q` (string) - Search query
- `search` (string) - Search term

#### Assessments Query Parameters
- `status` (string) - Filter by assessment status (`draft`, `submitted`, `reviewed`)
- `language` (string) - Filter by language code

### Path Parameters
- `:org_id` - Organization UUID
- `:assessment_id` - Assessment UUID
- `:question_id` - Question UUID
- `:response_id` - Response UUID
- `:file_id` - File UUID
- `:submission_id` - Submission UUID
- `:report_id` - Report UUID
- `:category_id` - Category UUID
- `:realm` - Keycloak realm name
- `:member_id` - Member ID
- `:alias` - Identity provider alias

## 🚨 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### Common Error Scenarios
- **Authentication Required**: All endpoints except `/health` require valid JWT token
- **Permission Denied**: User lacks required role (admin, org_admin, etc.)
- **Organization Mismatch**: User trying to access resources from different organization
- **Resource Not Found**: UUID doesn't exist or user doesn't have access
- **Validation Error**: Request body doesn't match expected schema

## 🔐 Authorization Levels

### No Authentication Required
- `GET /health` - System health check

### Basic Authentication Required
- All `/api/*` endpoints require valid JWT token
- User must be authenticated with Keycloak

### Organization Admin Required
- Assessment management (`POST`, `PUT`, `DELETE /api/assessments`)
- Organization member management
- Category assignment to organizations
- Report recommendation status updates

### Application Admin Required
- Organization management (`/api/admin/organizations`)
- User management (`/api/admin/users`)
- Global submissions and reports view
- Question and category management
- User invitations

## 🏗️ Architecture Notes

This backend serves as a **resource server** that:
- Validates JWT tokens from Keycloak
- Extracts user claims and organization information  
- Protects API endpoints based on roles and organization membership
- Serves business logic endpoints

User and organization management should be handled by the frontend through Keycloak's admin console or APIs directly.

### Key Features
- **Multi-tenant**: Organization-scoped data access
- **Role-based Access Control**: Different permission levels for different operations
- **File Management**: Upload, download, and attach files to responses
- **Assessment Workflow**: Draft → Submit → Review → Report generation
- **Internationalization**: Multi-language support for questions and content
- **Caching**: Session-based caching for improved performance

## 📤 Request Body Examples

### Create Assessment
```json
POST /api/assessments
{
  "language": "en",
  "name": "Sustainability Assessment 2024",
  "categories": ["social", "environment", "governance"]
}
```

### Create Question
```json
POST /api/questions
{
  "category": "social",
  "text": {
    "en": "How does your organization ensure fair labor practices?",
    "de": "Wie stellt Ihre Organisation faire Arbeitspraktiken sicher?"
  },
  "weight": 1.0
}
```

### Create Response
```json
POST /api/assessments/{assessment_id}/responses
[
  {
    "question_revision_id": "uuid",
    "response": "Our organization has implemented comprehensive fair labor policies..."
  }
]
```

### Assign Categories to Organization
```json
POST /api/organizations/{keycloak_organization_id}/categories/assign
{
  "category_catalog_ids": ["uuid1", "uuid2", "uuid3"],
  "weights": [1, 1, 1]
}
```

### Generate Report
```json
POST /api/submissions/{submission_id}/reports
[
  {
    "category": "social",
    "recommendation": "Implement regular employee satisfaction surveys",
    "status": "pending"
  }
]
```

### Update Recommendation Status
```json
PUT /api/reports/{report_id}/recommendations/{category}/status
{
  "report_id": "uuid",
  "recommendation_id": "uuid",
  "category": "social",
  "status": "completed"
}
```

### Create Organization
```json
POST /api/admin/organizations
{
  "name": "Example Organization",
  "domains": [
    {
      "name": "example.com"
    }
  ],
  "redirectUrl": "https://example.com",
  "enabled": "true"
}
```

### Add Member to Organization
```json
POST /api/organizations/{org_id}/members
{
  "user_id": "user-uuid",
  "roles": ["view-assessments", "submit-responses"]
}
```
