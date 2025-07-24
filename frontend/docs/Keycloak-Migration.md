# Keycloak Authentication Migration Guide

## Overview

This document outlines the migration from `oidc-spa` library to `keycloak-js` library for Keycloak authentication in the Sustainability Assessment Tool. This migration was performed to resolve authentication issues in sandbox environments and provide a more stable authentication experience.

## Migration Summary

### What Changed

1. **Authentication Library**: Replaced `oidc-spa` with `keycloak-js`
2. **Configuration**: Updated Keycloak configuration to use native keycloak-js settings
3. **Authentication Service**: Created new `authService.ts` to handle all authentication operations
4. **Hook Updates**: Updated `useAuth` hook to work with the new authentication service
5. **API Integration**: Updated OpenAPI interceptors to use the new token retrieval method

### Files Modified

#### New Files Created
- `frontend/src/services/shared/keycloakConfig.ts` - Keycloak configuration
- `frontend/src/services/shared/authService.ts` - Authentication service
- `frontend/src/services/shared/fetchWithAuth.ts` - Fetch wrapper with authentication
- `frontend/public/silent-check-sso.html` - Silent SSO check page

#### Files Updated
- `frontend/src/hooks/shared/useAuth.ts` - Updated to use new auth service
- `frontend/src/main.tsx` - Updated OpenAPI interceptors
- `frontend/src/App.tsx` - Removed OidcProvider wrapper
- `frontend/package.json` - Removed oidc-spa dependency

#### Files Removed
- `frontend/src/services/shared/oidc.ts` - Old oidc-spa configuration

## Technical Implementation

### Keycloak Configuration

```typescript
// keycloakConfig.ts
import Keycloak from 'keycloak-js';

export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_ISSUER_URI?.replace('/realms/sustainability-realm', '') || 'http://localhost:8080',
  realm: 'sustainability-realm',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sustainability-tool',
};

export const keycloak = new Keycloak(keycloakConfig);

export const keycloakInitOptions = {
  checkLoginIframe: false,
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256',
  enableLogging: import.meta.env.DEV,
};
```

### Authentication Service

The new `authService.ts` provides the following key functions:

- `initializeAuth()` - Initialize Keycloak authentication
- `login()` - Handle user login
- `logout()` - Handle user logout
- `getAccessToken()` - Get current access token with automatic refresh
- `getUserProfile()` - Get user profile information
- `isAuthenticated()` - Check authentication status
- `getUserRoles()` - Get user roles

### Updated useAuth Hook

The `useAuth` hook now:

1. Initializes Keycloak on component mount
2. Manages authentication state
3. Provides login/logout functions
4. Handles offline access with stored user data
5. Automatically refreshes tokens when needed

## Benefits of Migration

### 1. Improved Stability
- `keycloak-js` is the official Keycloak JavaScript adapter
- Better compatibility with Keycloak server versions
- More reliable token refresh mechanisms

### 2. Better Error Handling
- More detailed error messages
- Better handling of network issues
- Improved offline/online state management

### 3. Enhanced Security
- PKCE (Proof Key for Code Exchange) enabled by default
- Better token validation
- Improved session management

### 4. Simplified Configuration
- Direct Keycloak configuration without abstraction layers
- Easier debugging and troubleshooting
- Better integration with Keycloak features

## Environment Variables

The following environment variables are used:

```bash
VITE_KEYCLOAK_ISSUER_URI=http://localhost:8080/realms/sustainability-realm
VITE_KEYCLOAK_CLIENT_ID=sustainability-tool
VITE_KEYCLOAK_SCOPES=openid profile email
VITE_KEYCLOAK_HOME_URL=http://localhost:5173
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5173/callback
```

## Authentication Flow

### Login Flow
1. User clicks login button
2. `authService.login()` is called
3. User is redirected to Keycloak login page
4. After successful authentication, user is redirected back to the application
5. Keycloak automatically handles token exchange
6. User profile and tokens are stored in IndexedDB
7. User is redirected to dashboard

### Token Refresh
1. `getAccessToken()` is called before API requests
2. If token is expired or about to expire, `keycloak.updateToken()` is called
3. New tokens are automatically stored
4. API request proceeds with fresh token

### Logout Flow
1. User clicks logout button
2. `authService.logout()` is called
3. Local data is cleared from IndexedDB
4. User is redirected to Keycloak logout endpoint
5. Keycloak terminates the session
6. User is redirected to login page

## Testing the Migration

### 1. Build Verification
```bash
cd frontend
npm install
npm run ts:check
npm run build
```

### 2. Local Development
```bash
npm run dev
```

### 3. Authentication Testing
- Test login flow
- Test logout flow
- Test token refresh
- Test offline access
- Test role-based access control

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Keycloak is configured to allow your application's origin
   - Check that the client ID matches in both frontend and Keycloak

2. **Token Refresh Issues**
   - Verify that refresh tokens are enabled in Keycloak client configuration
   - Check that the client has the correct redirect URIs configured

3. **Silent SSO Issues**
   - Ensure the silent-check-sso.html file is accessible
   - Check that the silentCheckSsoRedirectUri is correctly configured

### Debug Mode

Enable debug logging by setting:
```typescript
enableLogging: true
```

This will provide detailed console output for authentication operations.

## Rollback Plan

If issues arise, the migration can be rolled back by:

1. Reinstalling oidc-spa: `npm install oidc-spa`
2. Restoring the old oidc.ts file
3. Reverting the useAuth hook changes
4. Restoring the OidcProvider in App.tsx

## Conclusion

The migration to `keycloak-js` provides a more stable and maintainable authentication solution. The official Keycloak JavaScript adapter offers better compatibility, improved error handling, and enhanced security features. This migration resolves the authentication issues experienced in sandbox environments while maintaining all existing functionality. 