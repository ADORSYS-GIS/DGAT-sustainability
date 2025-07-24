# Authentication System

This application uses **oidc-spa** for OpenID Connect authentication with Keycloak.

## Overview

The authentication system is built on top of the [oidc-spa](https://docs.oidc-spa.dev/usage) library, which provides a modern, type-safe way to handle OIDC authentication in React applications.

## Key Features

- **Type-safe**: Full TypeScript support with proper type definitions
- **React hooks**: Easy-to-use hooks for authentication state
- **Automatic token management**: Handles token refresh and storage automatically
- **Protected routes**: Built-in support for route protection
- **Role-based access control**: Support for user roles and permissions

## Configuration

The authentication is configured in `src/services/shared/oidc.ts`:

```typescript
export const { OidcProvider, useOidc, getOidc, withLoginEnforced, enforceLogin } =
  createReactOidc(async () => ({
    issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
    extraQueryParams: () => ({
      ui_locales: "en"
    }),
    decodedIdTokenSchema
  }));
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

### 3. Direct OIDC Access

For advanced use cases, use the `useOidc` hook directly:

```typescript
import { useOidc } from "@/services/shared/oidc";

function AdvancedComponent() {
  const oidc = useOidc({ assert: "user logged in" });
  
  const handleLogout = () => {
    oidc.logout({ redirectTo: "home" });
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

### 4. Authenticated API Calls

Use the `fetchWithAuth` helper for API calls that require authentication:

```typescript
import { fetchWithAuth } from "@/services/shared/oidc";

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
- `org_user`: Regular user access

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

## Migration from Previous Auth System

If migrating from a previous authentication system:

1. Replace `useAuth()` calls with the new implementation
2. Update protected routes to use `ProtectedRoute`
3. Replace direct API calls with `fetchWithAuth`
4. Update user object access patterns

## Examples

See `src/components/shared/AuthDemo.tsx` for complete examples of:
- Basic authentication usage
- Protected components
- Role-based rendering
- Login/logout functionality 