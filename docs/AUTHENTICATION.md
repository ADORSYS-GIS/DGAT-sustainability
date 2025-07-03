# Authentication and Authorization System

This document provides comprehensive documentation for the Rust-based authentication and authorization system integrated with Keycloak.

## Overview

The system implements a role-based access control (RBAC) architecture with two primary roles:
- **application_admin**: Can manage all organizations and create organization admins
- **organization_admin**: Can manage only their assigned organization and its users

## Architecture

### Components

1. **JWT Validator** (`jwt_validator.rs`)
   - Validates JWT tokens from Keycloak
   - Caches public keys for performance
   - Extracts user claims from validated tokens

2. **Claims Model** (`claims.rs`)
   - Represents user information from JWT tokens
   - Provides role-checking utilities
   - Implements organization-based authorization logic

3. **Keycloak Admin Client** (`keycloak.rs`)
   - Manages organizations and users in Keycloak
   - Handles role assignments
   - Provides CRUD operations for organizations and users

4. **Middleware** (`midlw.rs`)
   - Authentication middleware for JWT validation
   - Role-based authorization middleware
   - Request logging and error handling

5. **HTTP Handlers** (`organization_handlers.rs`)
   - REST API endpoints for organization and user management
   - Implements proper authorization checks
   - Provides consistent API responses

6. **Routes Configuration** (`routes.rs`)
   - Wires together all components
   - Demonstrates proper middleware application
   - Includes health check endpoints

## Role-Based Access Control

### Application Admin (`application_admin`)
- **Permissions**:
  - Create, read, update, delete any organization
  - Create organization admin users
  - Manage users in any organization
  - Full system access

### Organization Admin (`organization_admin`)
- **Permissions**:
  - Read, update their assigned organization
  - Create, read, delete users in their organization
  - Cannot create other organizations
  - Cannot delete organizations

## API Endpoints

### Authentication
All API endpoints (except `/health`) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Organization Management

#### List Organizations
```http
GET /api/v1/organizations
```
- **Authorization**: Any authenticated user
- **Behavior**: 
  - `application_admin`: Returns all organizations
  - `organization_admin`: Returns only their organization

#### Create Organization
```http
POST /api/v1/organizations
Content-Type: application/json

{
  "name": "Example Organization",
  "description": "An example organization",
  "country": "US"
}
```
- **Authorization**: `application_admin` only

#### Get Organization
```http
GET /api/v1/organizations/{id}
```
- **Authorization**: Users who can manage the organization

#### Update Organization
```http
PUT /api/v1/organizations/{id}
Content-Type: application/json

{
  "name": "Updated Organization Name",
  "description": "Updated description",
  "country": "CA"
}
```
- **Authorization**: Users who can manage the organization

#### Delete Organization
```http
DELETE /api/v1/organizations/{id}
```
- **Authorization**: `application_admin` only

### User Management

#### List Organization Users
```http
GET /api/v1/organizations/{id}/users
```
- **Authorization**: Users who can manage the organization

#### Create User
```http
POST /api/v1/organizations/{id}/users
Content-Type: application/json

{
  "username": "john.doe",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": "org-uuid",
  "password": "secure-password"
}
```
- **Authorization**: Users who can manage the organization

#### Get User
```http
GET /api/v1/users/{id}
```
- **Authorization**: Users who can manage the user's organization

#### Delete User
```http
DELETE /api/v1/users/{id}
```
- **Authorization**: Users who can manage the user's organization

### Administrative Operations

#### Create Organization Admin
```http
POST /api/v1/admin/organization-admins
Content-Type: application/json

{
  "username": "org.admin",
  "email": "admin@organization.com",
  "first_name": "Organization",
  "last_name": "Admin",
  "organization_id": "org-uuid",
  "password": "secure-password"
}
```
- **Authorization**: `application_admin` only

## Security Considerations

1. **JWT Validation**: All tokens are validated against Keycloak public keys
2. **Role Verification**: Roles are checked on every request
3. **Organization Isolation**: Users can only access their assigned organizations
4. **Audit Logging**: All authentication and authorization events are logged
5. **Token Caching**: Public keys are cached for performance but refreshed as needed

## Configuration

### Environment Variables
```bash
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=sustainability-realm
KEYCLOAK_CLIENT_ID=backend-client
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

### Keycloak Setup
1. Create a realm for your application
2. Create client credentials for the backend service
3. Define roles: `application_admin`, `organization_admin`
4. Configure user attributes for organization mapping

## Error Handling

The system provides consistent error responses:

### Authentication Errors
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Valid token but insufficient permissions

### API Errors
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors

### Error Response Format
```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```

### Success Response Format
```json
{
  "success": true,
  "data": {},
  "message": null
}
```

## Performance Considerations

1. **Key Caching**: Public keys are cached to avoid repeated Keycloak requests
2. **Connection Pooling**: HTTP client reuses connections
3. **Async Operations**: All I/O operations are asynchronous
4. **Minimal Token Validation**: Only essential claims are extracted and validated

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh
2. **Rate Limiting**: Add rate limiting for API endpoints
3. **Audit Trail**: Enhanced audit logging for compliance
4. **Multi-tenancy**: Support for multiple realms/tenants
5. **Permission Granularity**: More fine-grained permissions within organizations