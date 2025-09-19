# Authentication System

This application uses **keycloak-js** for OpenID Connect authentication with Keycloak.

## Overview

The authentication system is built on top of the [keycloak-js](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter) library, which provides a modern, type-safe way to handle OIDC authentication in React applications.

## Key Features

- **Type-safe**: Full TypeScript support with proper type definitions
- **React hooks**: Easy-to-use hooks for authentication state
- **Automatic token management**: Handles token refresh and storage automatically
- **Protected routes**: Built-in support for route protection
- **Role-based access control**: Support for user roles and permissions
- **Offline support**: Tokens stored in IndexedDB for offline access

## Configuration

The authentication is configured in `src/services/shared/keycloakConfig.ts`:

```typescript
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "sustainability-realm",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "sustainability-tool",
};
```

### Environment Variables

Required environment variables (defined in `docker-compose.yml`):

- `VITE_KEYCLOAK_URL`: Keycloak server URL (e.g., `http://localhost:8080`)
- `VITE_KEYCLOAK_REALM`: Keycloak realm name (e.g., `sustainability-realm`)
- `VITE_KEYCLOAK_CLIENT_ID`: Keycloak client ID (e.g., `sustainability-tool`)

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

Use `ProtectedRoute` to create components that require authentication:

```typescript
import { ProtectedRoute } from "@/router/ProtectedRoute";

const ProtectedComponent = () => {
  const { user } = useAuth();

  return <div>Hello, {user?.name}!</div>;
};

// In your routes
<Route
  path="/dashboard"
  element={
    <ProtectedRoute roles={["drgv_admin", "org_admin"]}>
      <ProtectedComponent />
    </ProtectedRoute>
  }
/>
```

### 3. Direct Keycloak Access

For advanced use cases, use the auth service directly:

```typescript
import { getAccessToken, login, logout } from "@/services/shared/authService";

function AdvancedComponent() {
  const handleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

### 4. Authenticated API Calls

Use the `fetchWithAuth` helper for API calls that require authentication:

```typescript
import { fetchWithAuth } from "@/services/shared/authService";

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
interface UserProfile {
  sub: string; // User ID
  preferred_username?: string; // Username
  name?: string; // Full name
  email?: string; // Email address
  roles?: string[]; // User roles
  realm_access?: { roles: string[] }; // Realm roles
  organizations?: Record<
    string,
    {
      // Organization data
      id: string;
      categories: string[];
    }
  >;
  categories?: string[]; // Personal categories
}
```

## Token Management

The system automatically handles:

- **Token Storage**: Tokens are stored securely in IndexedDB
- **Token Refresh**: Automatic refresh 30 seconds before expiry
- **Offline Access**: Tokens persist across browser sessions
- **Security**: Tokens are cleared on logout

## Migration from oidc-spa

This application was migrated from `oidc-spa` to `keycloak-js` for better:

- **Compatibility**: Native Keycloak integration
- **Performance**: Optimized token handling
- **Features**: Better SSO and silent refresh support
- **Maintenance**: Official Keycloak library
