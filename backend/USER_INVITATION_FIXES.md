# User Invitation Flow Fixes

## 🚨 Issues Fixed

### 1. **Missing Type Definitions**
- Added `KeycloakUser`, `CreateUserRequest`, `KeycloakCredential` types
- Added `UserInvitationRequest`, `UserInvitationResponse`, `UserInvitationStatus` types
- Added `EmailVerificationEvent` type

### 2. **Email Verification Not Triggered**
- **Problem**: Setting `requiredActions: ["VERIFY_EMAIL"]` doesn't automatically send emails
- **Fix**: Added `trigger_email_verification()` method that calls Keycloak's email endpoints
- **Methods Used**:
  - `POST /admin/realms/{realm}/users/{user_id}/send-verify-email`
  - `PUT /admin/realms/{realm}/users/{user_id}/execute-actions-email`

### 3. **Manual Testing Endpoints**
- Added `/api/admin/user-invitations/{user_id}/trigger-verification` for manual email triggering
- Added `/api/admin/user-invitations/{user_id}/trigger-org-invitation` for manual organization invitation

## 🔧 How It Works Now

### Step 1: User Creation
```rust
// Creates user in Keycloak with:
// - emailVerified: false
// - requiredActions: ["VERIFY_EMAIL"]
// - temporary password
// - user attributes with organization info
```

### Step 2: Email Verification Trigger
```rust
// Automatically triggers email verification email
self.trigger_email_verification(token, user_id).await?;
```

### Step 3: Webhook Handling (When Email is Verified)
```rust
// Keycloak calls webhook when user verifies email
// Backend processes the verification event
// Sends organization invitation
```

## 🧪 Testing the Fixes

### Option 1: Use the Test Script
```bash
# Edit the script to add your admin token and organization ID
nano test_user_invitation.sh

# Run the test
./test_user_invitation.sh
```

### Option 2: Manual Testing

#### 1. Create User Invitation
```bash
curl -X POST "http://localhost:3001/api/admin/user-invitations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "organization_id": "your-org-id",
    "roles": ["org_user"],
    "categories": ["environmental"]
  }'
```

#### 2. Check User Status
```bash
curl -X GET "http://localhost:3001/api/admin/user-invitations/{user_id}/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 3. Manually Trigger Email Verification (for testing)
```bash
curl -X POST "http://localhost:3001/api/admin/user-invitations/{user_id}/trigger-verification" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 4. Manually Trigger Organization Invitation (for testing)
```bash
curl -X POST "http://localhost:3001/api/admin/user-invitations/{user_id}/trigger-org-invitation" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔍 Debugging Steps

### 1. Check if User is Created
- Go to Keycloak Admin Console
- Navigate to Users
- Look for the created user

### 2. Check Email Verification
- Look in Keycloak logs for email sending attempts
- Check your email server configuration
- Use the manual trigger endpoint to test

### 3. Check Organization Invitation
- Look in Keycloak logs for invitation creation
- Check organization invitations in Keycloak admin console
- Use the manual trigger endpoint to test

### 4. Check Backend Logs
```bash
# Look for these log messages:
# - "User created successfully with email verification required"
# - "Email verification email triggered successfully"
# - "Organization invitation sent successfully"
```

## ⚙️ Keycloak Configuration Required

### 1. Email Server Configuration
Make sure Keycloak is configured with a valid SMTP server:
- Go to Keycloak Admin Console
- Navigate to Realm Settings > Email
- Configure SMTP settings

### 2. Webhook Configuration (Optional)
To enable automatic webhook calls:
- Go to Keycloak Admin Console
- Navigate to Events
- Add webhook URL: `http://your-backend:3001/api/admin/webhooks/email-verification`
- Select events: `EMAIL_VERIFIED`, `USER_UPDATED`

### 3. Organization Invitation API
Make sure the organization invitation API endpoint exists in your Keycloak setup:
```
POST /admin/realms/{realm}/organizations/{org_id}/invitations
```

## 📋 Expected Flow

1. **Admin creates invitation** → User created in Keycloak
2. **Email verification triggered** → Email sent to user
3. **User verifies email** → Webhook called (if configured)
4. **Organization invitation sent** → Second email sent to user
5. **User accepts invitation** → User joins organization

## 🚀 Next Steps

1. **Test the fixes** using the provided endpoints
2. **Configure Keycloak email settings** if emails aren't being sent
3. **Set up webhooks** for automatic flow (optional)
4. **Monitor logs** to ensure everything works correctly

## 📞 Troubleshooting

If emails still aren't being sent:
1. Check Keycloak SMTP configuration
2. Check Keycloak logs for email errors
3. Use manual trigger endpoints to test
4. Verify organization invitation API exists
5. Check backend logs for errors
