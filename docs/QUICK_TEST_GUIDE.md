# Quick Test Guide: User Invitation Flow

## 🚀 Quick Start Testing

### 1. Start the Application
```bash
# Terminal 1: Start Backend
cd backend
cargo run

# Terminal 2: Start Frontend  
cd frontend
npm run dev

# Terminal 3: Start Keycloak (if using Docker)
docker-compose up keycloak
```

### 2. Access Admin Interface
1. Open browser: `http://localhost:5173/admin`
2. Login with admin credentials
3. Navigate to "Manage Users"

### 3. Test the Flow

#### Step 1: Create User Invitation
1. Select an organization
2. Click **"Create Invitation"** button (blue button with UserPlus icon)
3. Fill the form:
   - **Email**: `test@example.com`
   - **First Name**: `John`
   - **Last Name**: `Doe`
   - **Roles**: Select `org_user`
   - **Categories**: Select any categories
4. Click **"Create Invitation"**
5. ✅ **Expected**: Success message, dialog closes

#### Step 2: Check Email 1 (Verification)
1. Check email for `test@example.com`
2. **Subject**: "Verify your email address"
3. **Content**: Temporary password + verification link
4. ✅ **Expected**: Email received with verification link

#### Step 3: Verify Email
1. Click the verification link in Email 1
2. Enter the temporary password
3. Click "Verify Email"
4. ✅ **Expected**: Email verification success

#### Step 4: Check Email 2 (Organization Invitation)
1. Check email again for `test@example.com`
2. **Subject**: "You're invited to join [Organization Name]"
3. **Content**: Organization invitation link
4. ✅ **Expected**: Second email received with org invitation

#### Step 5: Accept Organization Invitation
1. Click the organization invitation link
2. Review organization details
3. Click "Accept Invitation"
4. ✅ **Expected**: User joins organization successfully

#### Step 6: Verify in Admin Interface
1. Go back to admin interface
2. Refresh the user list
3. Look for the new user with status "Active"
4. ✅ **Expected**: User appears with correct roles and verified email

## 🔍 What to Look For

### Success Indicators
- ✅ Invitation created successfully
- ✅ Two separate emails sent
- ✅ Email verification works
- ✅ Organization invitation works
- ✅ User appears in admin interface
- ✅ User status is "Active"

### Error Indicators
- ❌ Form validation errors
- ❌ Emails not received
- ❌ Verification links don't work
- ❌ User doesn't appear in list
- ❌ Permission errors

## 🐛 Quick Debug

### If Emails Not Sending
```bash
# Check Keycloak logs
docker-compose logs keycloak

# Check SMTP settings in Keycloak admin
# Verify email templates are configured
```

### If Webhook Not Working
```bash
# Check backend logs
cd backend
cargo run -- --log-level debug

# Test webhook endpoint
curl -X POST http://localhost:8080/api/admin/webhooks/email-verification \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","email":"test@example.com","verified_at":"2024-01-01T00:00:00Z","event_type":"EMAIL_VERIFIED"}'
```

### If UI Not Working
```bash
# Check browser console for errors
# Check network tab for failed requests
# Verify API endpoints are accessible
```

## 📋 Test Checklist

- [ ] Can access admin interface
- [ ] Can create user invitation
- [ ] Email 1 (verification) sent
- [ ] Email verification works
- [ ] Email 2 (organization) sent
- [ ] Organization invitation works
- [ ] User appears in admin list
- [ ] User status is "Active"
- [ ] Roles assigned correctly
- [ ] Error handling works

## 🎯 Expected Flow Timeline

```
0s    → Admin creates invitation
5s    → Email 1 sent (verification)
30s   → User clicks verification link
35s   → Email 2 sent (organization)
60s   → User accepts organization invitation
65s   → User appears in admin interface
```

## 🔧 Configuration Check

### Keycloak Settings
- [ ] Email verification action enabled
- [ ] SMTP configured correctly
- [ ] Email templates set up
- [ ] Webhook endpoints configured

### Environment Variables
```bash
# Check these are set
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_FROM=noreply@example.com
KEYCLOAK_URL=https://keycloak.example.com
KEYCLOAK_REALM=sustainability-realm
```

## 📞 Need Help?

If you encounter issues:

1. **Check logs**: Backend, frontend, and Keycloak logs
2. **Verify configuration**: Email and Keycloak settings
3. **Test API endpoints**: Use curl commands above
4. **Check browser console**: For frontend errors

The complete testing guide is available in `docs/TESTING_GUIDE.md` for detailed testing scenarios.
