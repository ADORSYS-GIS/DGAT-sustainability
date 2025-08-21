# Keycloak Webhook Setup for Automatic Email Verification

This guide explains how to configure Keycloak to automatically send webhooks when users verify their email, enabling the two-email sequential flow.

## 🎯 Overview

When configured properly, the flow will be:
1. Admin creates user invitation → Email 1 (verification) sent
2. User verifies email → Keycloak sends webhook to backend
3. Backend receives webhook → Email 2 (organization invitation) sent automatically

## 🔧 Configuration Methods

### Method 1: Docker Compose (Recommended)

The webhook is already configured in `docker-compose.yml`:

```yaml
KC_SPI_EVENTS_LISTENER_WEBHOOK_URL: "http://backend:3001/api/admin/webhooks/email-verification"
KC_SPI_EVENTS_LISTENER_WEBHOOK_TIMEOUT: "5000"
KC_SPI_EVENTS_LISTENER_WEBHOOK_RETRY: "3"
```

**Steps:**
1. Restart Keycloak container: `docker-compose restart keycloak`
2. Verify webhook is active in Keycloak Admin Console

### Method 2: Manual Configuration via Admin Console

1. **Access Keycloak Admin Console**
   - URL: `http://localhost:8080/admin`
   - Login with admin credentials

2. **Navigate to Event Configuration**
   - Go to **Realm Settings** → **Events**

3. **Enable Events**
   - ✅ **Events enabled**: Check this box
   - ✅ **Event listeners**: Add `webhook` to the list

4. **Configure Event Types**
   - ✅ **Enabled event types**: Select these events:
     - `EMAIL_VERIFIED`
     - `USER_UPDATED`
     - `USER_CREATED`

5. **Set Webhook URL**
   - **Webhook URL**: `http://backend:3001/api/admin/webhooks/email-verification`
   - **Timeout**: `5000` (5 seconds)
   - **Retry**: `3` attempts

6. **Save Configuration**
   - Click **Save** to apply changes

### Method 3: Automated Script

Run the provided script:

```bash
./configure_keycloak_webhooks.sh
```

**Note:** The script configures events but requires manual webhook URL setup in the admin console.

## 🧪 Testing the Webhook

### Step 1: Verify Webhook Endpoint

Test if the webhook endpoint is accessible:

```bash
curl -X POST http://localhost:3001/api/admin/webhooks/email-verification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EMAIL_VERIFIED",
    "userId": "test-user-id",
    "email": "test@example.com",
    "verifiedAt": "2024-01-01T00:00:00Z"
  }'
```

Expected response: `200 OK`

### Step 2: Test Complete Flow

1. **Create User Invitation**
   - Go to frontend admin panel
   - Create a new user invitation
   - Verify Email 1 (verification) is sent

2. **Verify Email**
   - Check email for verification link
   - Click the verification link
   - Complete email verification in Keycloak

3. **Check Backend Logs**
   ```bash
   docker-compose logs -f backend
   ```
   Look for webhook events:
   ```
   INFO  webhook > Email verification webhook received
   INFO  webhook > Processing email verification for user: xxx
   INFO  webhook > Organization invitation sent successfully
   ```

4. **Verify Email 2**
   - Check email for organization invitation
   - Should be sent automatically after verification

## 🔍 Troubleshooting

### Webhook Not Received

1. **Check Keycloak Event Configuration**
   ```bash
   curl -X GET http://localhost:8080/admin/realms/master/events/config \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Verify Webhook URL**
   - Ensure URL is accessible from Keycloak container
   - Check network connectivity between containers

3. **Check Keycloak Logs**
   ```bash
   docker-compose logs -f keycloak
   ```
   Look for webhook delivery attempts and errors.

### Webhook Received but Organization Invitation Not Sent

1. **Check Backend Logs**
   ```bash
   docker-compose logs -f backend
   ```
   Look for errors in webhook processing.

2. **Verify User Attributes**
   - Ensure user has `organization_id`, `pending_roles`, `pending_categories`
   - Check if email is actually verified

3. **Test Manual Trigger**
   ```bash
   curl -X POST http://localhost:3001/api/admin/user-invitations/USER_ID/check-and-trigger \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

### Email Configuration Issues

1. **Verify SMTP Settings**
   - Check Keycloak email configuration
   - Test email delivery

2. **Check Email Templates**
   - Verify organization invitation template exists
   - Check template variables

## 📋 Configuration Checklist

- [ ] Keycloak events enabled
- [ ] Webhook listener configured
- [ ] Email verification events enabled
- [ ] Webhook URL set correctly
- [ ] Backend webhook endpoint accessible
- [ ] Email templates configured
- [ ] SMTP settings verified
- [ ] Test flow completed successfully

## 🚀 Production Considerations

1. **Security**
   - Use HTTPS for webhook URLs in production
   - Implement webhook signature verification
   - Use secure admin credentials

2. **Reliability**
   - Configure webhook retries
   - Monitor webhook delivery
   - Set up alerting for failed webhooks

3. **Performance**
   - Configure appropriate timeouts
   - Monitor webhook processing times
   - Scale backend if needed

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend and Keycloak logs
3. Test with manual trigger endpoints
4. Verify all configuration steps are completed

The webhook-based approach provides the most reliable and automated solution for the two-email sequential flow.
