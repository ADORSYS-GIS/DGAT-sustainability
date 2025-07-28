# Authentication System

This application uses **Keycloak.js** for OpenID Connect authentication with Keycloak.

## Overview

The authentication system is built on top of the [Keycloak.js](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter) library, which provides a modern, type-safe way to handle OIDC authentication in React applications.

## Key Features

- **Type-safe**: Full TypeScript support with proper type definitions
- **React hooks**: Easy-to-use hooks for authentication state
- **Automatic token management**: Handles token refresh and storage automatically
- **Protected routes**: Built-in support for route protection
- **Role-based access control**: Support for user roles and permissions

## Configuration

The authentication is configured in `src/services/shared/keycloakService.ts`:

```typescript
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};
```

### Environment Variables

Required environment variables (defined in `docker-compose.yml`):

- `VITE_KEYCLOAK_ISSUER_URI`: Keycloak realm URL (e.g., `http://localhost:8080/realms/sustainability-realm`)
- `VITE_KEYCLOAK_CLIENT_ID`: Keycloak client ID (e.g., `sustainability-tool`)
- `VITE_KEYCLOAK_HOME_URL`: Application home URL (e.g., `http://localhost:5173/`)

## Usage

### 1. Basic Authentication Hook

Use the `useAuth` hook to access authentication state:

```typescript
import { useAuth } from "@/hooks/shared/useAuth";

function MyComponent() {
  const { isAuthenticated, user, roles, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <p>Roles: {roles.join(", ")}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Protected Components

Use `withLoginEnforced` to create components that require authentication:

```typescript
import { withLoginEnforced } from "@/services/shared/oidc";

const ProtectedComponent = withLoginEnforced(() => {
  const { user } = useAuth();
  
  return <div>Hello, {user?.name}!</div>;
});
```

### 3. Direct Keycloak Access

For advanced use cases, use the `useKeycloak` hook directly:

```typescript
import { useKeycloak } from "@/services/shared/keycloakProvider";

function AdvancedComponent() {
  const { keycloak, isAuthenticated, login, logout } = useKeycloak();
  
  const handleLogout = () => {
    logout();
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

### 4. Authenticated API Calls

Use the `fetchWithAuth` helper for API calls that require authentication:

```typescript
import { fetchWithAuth } from "@/services/shared/keycloakService";

async function fetchUserData() {
  const response = await fetchWithAuth("/api/user/profile");
  const data = await response.json();
  return data;
}
```

### 5. Protected Routes

The application uses a `ProtectedRoute` component for route-level protection:

```typescript
// In routes.ts
{
  path: "/dashboard",
  element: React.createElement(ProtectedRoute, {}),
  children: [{ path: "", element: React.createElement(Dashboard) }],
}
```

## User Roles

The system supports the following roles:

- `drgv_admin`: Full administrative access
- `org_admin`: Organization-level administrative access
- `Org_User`: Regular user access

## User Object Structure

The user object contains:

```typescript
interface User {
  sub: string;                    // User ID
  preferred_username?: string;    // Username
  name?: string;                  // Full name
  email?: string;                 // Email address
  roles?: string[];               // User roles
  realm_access?: {                // Keycloak realm roles
    roles: string[]
  };
  organisations?: Record<string, any>; // Organization data
  organisation_name?: string;     // Organization name
  organisation?: string;          // Organization identifier
}
```

## Error Handling

The authentication system handles various error scenarios:

- **Network errors**: Automatic retry with exponential backoff
- **Token expiration**: Automatic token refresh
- **Invalid tokens**: Redirect to login
- **Access denied**: Redirect to unauthorized page

## Security Features

- **Token storage**: Tokens are stored securely in memory
- **Automatic logout**: Logout on token expiration
- **CSRF protection**: Built-in CSRF protection
- **Secure redirects**: Validated redirect URLs
- **PKCE**: Enabled by default for secure SPA authentication

## Migration from OIDC-spa

The application has been migrated from `oidc-spa` to `keycloak-js` to resolve issues with the OIDC-spa library. The migration maintains full compatibility with existing code:

### Key Changes

1. **Provider**: `OidcProvider` now uses `KeycloakProvider` underneath
2. **Hooks**: `useOidc` now uses `useKeycloak` underneath
3. **Token Management**: Automatic token refresh with Keycloak.js
4. **Silent SSO**: Improved silent token refresh handling

### Compatibility Layer

A compatibility layer has been implemented to ensure existing code continues to work:

- `useOidc()` hook maintains the same interface
- `getOidc()` function maintains the same interface
- `fetchWithAuth()` helper maintains the same interface
- All existing components continue to work without changes

## Troubleshooting

### Common Issues

1. **"Missing <canvas id='radar-canvas'> in DOM"**
   - This is related to the PDF export functionality, not authentication
   - Ensure the canvas element exists in your component

2. **Authentication not working**
   - Check environment variables are correctly set
   - Verify Keycloak is running and accessible
   - Check browser console for errors

3. **Role-based access not working**
   - Verify user has correct roles assigned in Keycloak
   - Check role names match exactly (case-sensitive)

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
VITE_DEBUG=true
```

## Examples

### Login Component

```typescript
import { useAuth } from "@/hooks/shared/useAuth";

export const Login = () => {
  const { login } = useAuth();
  
  return (
    <button onClick={login}>
      Sign in with Keycloak
    </button>
  );
};
```

### Protected Component

```typescript
import { useAuth } from "@/hooks/shared/useAuth";

export const Dashboard = () => {
  const { user, roles } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Your roles: {roles.join(", ")}</p>
    </div>
  );
};
```

### API Call with Authentication

```typescript
import { fetchWithAuth } from "@/services/shared/keycloakService";

const fetchUserData = async () => {
  const response = await fetchWithAuth("/api/user/profile");
  return response.json();
};
``` 