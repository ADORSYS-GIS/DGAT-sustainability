# Testing Guide: Two-Email Sequential User Invitation Flow

## Overview

This guide explains how to test the two-email sequential user invitation flow on the UI. The flow ensures users verify their email before being invited to join an organization.

## Prerequisites

### 1. Environment Setup
```bash
# Start the backend
cd backend
cargo run

# Start the frontend
cd frontend
npm run dev

# Start Keycloak (if using Docker)
docker-compose up keycloak
```

### 2. Keycloak Configuration
- Email verification action enabled
- Email templates configured
- SMTP settings configured
- Webhook endpoints configured

### 3. Admin Access
- You need admin credentials to access the user invitation feature
- Ensure you have the `admin` role assigned

## Testing Flow

### Step 1: Access the Admin Interface

1. **Navigate to Admin Dashboard**
   ```
   http://localhost:5173/admin
   ```

2. **Login as Admin**
   - Use your admin credentials
   - Ensure you have the `admin` role

3. **Go to Manage Users**
   - Click on "Manage Users" in the admin navigation
   - You should see the organization selection screen

### Step 2: Select Organization

1. **Choose an Organization**
   - Click on an organization card
   - You'll be taken to the user management screen for that organization

2. **Verify Organization Context**
   - You should see the organization name in the header
   - The "Back to Organizations" button should be visible

### Step 3: Create User Invitation

1. **Open Invitation Dialog**
   - Click the "Create Invitation" button (blue button with UserPlus icon)
   - This opens the UserInvitationForm dialog

2. **Fill the Invitation Form**
   ```
   First Name: John
   Last Name: Doe
   Email: test@example.com
   Organization: [Should be pre-selected]
   Roles: [Select org_user or org_admin]
   Categories: [Select relevant categories]
   ```

3. **Submit the Form**
   - Click "Create Invitation"
   - You should see a success message
   - The dialog should close

### Step 4: Verify Email 1 (Email Verification)

1. **Check Email**
   - Open the email sent to `test@example.com`
   - Subject: "Verify your email address"
   - Content should include:
     - Temporary password
     - Email verification link

2. **Verify Email Content**
   ```
   Subject: Verify your email address
   Content:
   - Welcome message
   - Temporary password: "TempAbc123!"
   - Verification link: https://keycloak/verify-email?token=...
   ```

### Step 5: User Verifies Email

1. **Click Verification Link**
   - Open the verification link in the email
   - You'll be redirected to Keycloak verification page

2. **Complete Verification**
   - Enter the temporary password
   - Click "Verify Email"
   - You should see a success message

### Step 6: Verify Email 2 (Organization Invitation)

1. **Check Second Email**
   - After email verification, user receives second email
   - Subject: "You're invited to join [Organization Name]"
   - Content should include:
     - Organization invitation link
     - Welcome message

2. **Verify Email Content**
   ```
   Subject: You're invited to join [Organization Name]
   Content:
   - "Your email has been verified successfully"
   - "You're invited to join [Organization Name]"
   - Invitation link: https://keycloak/org-invitation?token=...
   ```

### Step 7: User Accepts Organization Invitation

1. **Click Organization Invitation Link**
   - Open the organization invitation link
   - You'll be redirected to Keycloak organization invitation page

2. **Accept Invitation**
   - Review the organization details
   - Click "Accept Invitation"
   - You should be added to the organization

### Step 8: Verify User Status

1. **Check Admin Interface**
   - Go back to the admin interface
   - Refresh the user list
   - The new user should appear with status "Active"

2. **Verify User Details**
   - User should have the correct roles assigned
   - Email should be marked as verified
   - User should be part of the organization

## Testing Different Scenarios

### Scenario 1: Invalid Email
1. Try creating an invitation with an invalid email format
2. **Expected**: Form validation error

### Scenario 2: Duplicate Email
1. Try creating an invitation for an email that already exists
2. **Expected**: Error message about duplicate user

### Scenario 3: Email Verification Failure
1. Create invitation but don't verify email
2. **Expected**: User remains in "pending_email_verification" status

### Scenario 4: Organization Invitation Decline
1. Complete email verification but decline organization invitation
2. **Expected**: User remains in "pending_org_invitation" status

### Scenario 5: Different Roles
1. Create invitations with different role combinations:
   - `org_user` only
   - `org_admin` only
   - Both roles
2. **Expected**: Correct roles assigned after acceptance

## API Testing

### Test User Invitation Creation
```bash
curl -X POST http://localhost:8080/api/admin/user-invitations \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org-123",
    "roles": ["org_user"],
    "categories": ["category1"]
  }'
```

### Test Email Verification Webhook
```bash
curl -X POST http://localhost:8080/api/admin/webhooks/email-verification \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-456",
    "email": "test@example.com",
    "verified_at": "2024-01-01T00:00:00Z",
    "event_type": "EMAIL_VERIFIED"
  }'
```

### Test Invitation Status
```bash
curl -X GET http://localhost:8080/api/admin/user-invitations/user-456/status \
  -H "Authorization: Bearer <admin_token>"
```

## UI Testing Checklist

### Admin Interface
- [ ] Can access admin dashboard
- [ ] Can navigate to Manage Users
- [ ] Can select organization
- [ ] Can open invitation dialog
- [ ] Form validation works
- [ ] Success messages display correctly
- [ ] Error messages display correctly
- [ ] User list refreshes after invitation

### Invitation Form
- [ ] All fields are present
- [ ] Organization is pre-selected
- [ ] Role selection works
- [ ] Category selection works
- [ ] Form submission works
- [ ] Loading states display correctly

### Email Flow
- [ ] Email 1 (verification) is sent
- [ ] Email 1 contains correct content
- [ ] Email verification link works
- [ ] Email 2 (organization) is sent after verification
- [ ] Email 2 contains correct content
- [ ] Organization invitation link works

### User Status
- [ ] User appears in admin interface
- [ ] Status updates correctly through flow
- [ ] Final status is "Active"
- [ ] Roles are assigned correctly
- [ ] Categories are assigned correctly

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check SMTP configuration in Keycloak
   - Verify email templates are configured
   - Check Keycloak logs for errors

2. **Webhook Not Triggering**
   - Verify webhook endpoint is configured in Keycloak
   - Check backend logs for webhook errors
   - Ensure proper authentication

3. **User Not Appearing in List**
   - Check if user was created successfully
   - Verify organization assignment
   - Check for permission issues

4. **Form Validation Errors**
   - Check browser console for JavaScript errors
   - Verify API endpoint is accessible
   - Check network tab for failed requests

### Debug Steps

1. **Check Backend Logs**
   ```bash
   cd backend
   cargo run -- --log-level debug
   ```

2. **Check Frontend Console**
   - Open browser developer tools
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Check Keycloak Logs**
   ```bash
   docker-compose logs keycloak
   ```

4. **Verify API Endpoints**
   ```bash
   curl -X GET http://localhost:8080/api/health
   ```

## Expected Results

### Successful Flow
1. ✅ User invitation created successfully
2. ✅ Email 1 sent with verification link
3. ✅ User verifies email
4. ✅ Email 2 sent with organization invitation
5. ✅ User accepts organization invitation
6. ✅ User appears in admin interface with "Active" status

### Error Handling
1. ✅ Invalid email shows validation error
2. ✅ Duplicate email shows appropriate error
3. ✅ Network errors show user-friendly messages
4. ✅ Permission errors show access denied message

## Performance Testing

### Load Testing
1. Create multiple invitations simultaneously
2. Verify all emails are sent correctly
3. Check system performance under load

### Stress Testing
1. Create invitations rapidly
2. Verify no data corruption
3. Check memory usage

## Security Testing

### Authentication
1. Try accessing admin interface without login
2. Try creating invitations without admin role
3. Verify proper permission checks

### Authorization
1. Try accessing other organizations' data
2. Verify role-based access control
3. Check webhook security

This testing guide ensures comprehensive validation of the two-email sequential user invitation flow.
