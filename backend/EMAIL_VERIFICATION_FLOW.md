# Email Verification Flow Guide

## 🎯 How the Flow Should Work

### **Ideal Flow (Webhook-based)**
1. **Admin creates invitation** → User created in Keycloak
2. **Email verification triggered** → Email sent to user
3. **User verifies email** → Keycloak marks email as verified
4. **Keycloak calls webhook** → Backend receives notification
5. **Backend processes verification** → Automatically sends organization invitation
6. **Organization invitation sent** → User receives second email

### **Fallback Flow (Polling-based)**
1. **Admin creates invitation** → User created in Keycloak
2. **Email verification triggered** → Email sent to user
3. **User verifies email** → Keycloak marks email as verified
4. **Admin/System polls status** → Checks if email is verified
5. **Backend processes verification** → Automatically sends organization invitation
6. **Organization invitation sent** → User receives second email

## 🔧 Configuration Required

### **1. Keycloak Webhook Configuration (Recommended)**

To enable automatic webhook calls when email verification happens:

1. **Go to Keycloak Admin Console**
2. **Navigate to Events** (in the left sidebar)
3. **Configure Event Listeners**:
   - Add your webhook URL: `http://your-backend:3001/api/admin/webhooks/email-verification`
   - Select events: `EMAIL_VERIFIED`, `USER_UPDATED`
   - Enable the webhook

### **2. Keycloak Email Configuration**

Make sure Keycloak is configured to send emails:

1. **Go to Keycloak Admin Console**
2. **Navigate to Realm Settings > Email**
3. **Configure SMTP settings**:
   - Host: Your SMTP server
   - Port: SMTP port (usually 587 or 465)
   - Username: SMTP username
   - Password: SMTP password
   - Enable SSL/TLS

## 🧪 Testing the Flow

### **Option 1: Test with Webhook (Automatic)**

1. **Configure Keycloak webhook** (see above)
2. **Create user invitation** via frontend or API
3. **Check email** for verification link
4. **Click verification link** to verify email
5. **Check for second email** (organization invitation)

### **Option 2: Test with Polling (Manual)**

1. **Create user invitation**:
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

2. **Check user status**:
   ```bash
   curl -X GET "http://localhost:3001/api/admin/user-invitations/{user_id}/status" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Manually trigger email verification**:
   ```bash
   curl -X POST "http://localhost:3001/api/admin/user-invitations/{user_id}/trigger-verification" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. **Check and trigger organization invitation**:
   ```bash
   curl -X POST "http://localhost:3001/api/admin/user-invitations/{user_id}/check-and-trigger" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

### **Option 3: Use the Test Script**

```bash
# Edit the script with your admin token and organization ID
nano test_user_invitation.sh

# Run the test
./test_user_invitation.sh
```

## 🔍 Debugging Steps

### **1. Check if User is Created**
- Go to Keycloak Admin Console > Users
- Look for the created user
- Check user attributes for organization info

### **2. Check Email Verification**
- Look in Keycloak logs for email sending attempts
- Check your email server configuration
- Use manual trigger endpoint to test

### **3. Check Webhook Calls**
- Look in backend logs for webhook calls
- Check if webhook URL is accessible from Keycloak
- Verify webhook configuration in Keycloak

### **4. Check Organization Invitation**
- Look in Keycloak logs for invitation creation
- Check organization invitations in Keycloak admin console
- Use manual trigger endpoint to test

## 📋 Expected Log Messages

### **Backend Logs**
```
User created successfully with email verification required
Email verification email triggered successfully
Email verification webhook processed successfully
Organization invitation sent successfully
```

### **Keycloak Logs**
```
Email sent to user
User email verified
Webhook call to backend
Organization invitation created
```

## 🚨 Common Issues

### **Issue 1: Emails Not Being Sent**
- **Cause**: Keycloak SMTP not configured
- **Solution**: Configure SMTP settings in Keycloak

### **Issue 2: Webhook Not Called**
- **Cause**: Webhook not configured in Keycloak
- **Solution**: Configure webhook in Keycloak Events settings

### **Issue 3: Organization Invitation Not Sent**
- **Cause**: Organization invitation API not available
- **Solution**: Check if organization invitation endpoint exists in Keycloak

### **Issue 4: User Not Found**
- **Cause**: User ID mismatch or user not created
- **Solution**: Check user creation logs and verify user exists

## 🎯 Next Steps

1. **Configure Keycloak webhook** for automatic flow
2. **Test the complete flow** using the provided endpoints
3. **Monitor logs** to ensure everything works
4. **Set up monitoring** for webhook failures
5. **Implement retry logic** for failed webhook calls

## 📞 Support

If you're still having issues:
1. Check Keycloak documentation for webhook configuration
2. Verify your SMTP settings
3. Test with the manual endpoints first
4. Check both Keycloak and backend logs
5. Ensure all required Keycloak APIs are available
