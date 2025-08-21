#!/bin/bash

# Configure Keycloak Webhooks for Email Verification
# This script configures Keycloak to send webhooks when users verify their email

set -e

# Configuration
KEYCLOAK_URL="http://localhost:8080"
REALM="master"  # Change this to your realm name
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"  # Change this to your admin password
BACKEND_URL="http://localhost:3001"

echo "🔧 Configuring Keycloak Webhooks for Email Verification"
echo "======================================================"

# Get admin token
echo "📝 Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USERNAME}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to get admin token. Check your credentials."
    exit 1
fi

echo "✅ Admin token obtained successfully"

# Configure events
echo "📧 Configuring event settings..."
EVENT_CONFIG=$(cat <<EOF
{
  "eventsEnabled": true,
  "eventsListeners": ["webhook"],
  "eventsExpiration": 86400,
  "enabledEventTypes": [
    "EMAIL_VERIFIED",
    "USER_UPDATED",
    "USER_CREATED"
  ],
  "adminEventsEnabled": true,
  "adminEventsDetailsEnabled": true
}
EOF
)

# Update event configuration
RESPONSE=$(curl -s -w "%{http_code}" -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/events/config" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$EVENT_CONFIG")

HTTP_CODE="${RESPONSE: -3}"
RESPONSE_BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Event configuration updated successfully"
else
    echo "❌ Failed to update event configuration. HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

# Configure webhook URL
echo "🔗 Configuring webhook URL..."
WEBHOOK_CONFIG=$(cat <<EOF
{
  "webhook": {
    "url": "${BACKEND_URL}/api/admin/webhooks/email-verification",
    "timeout": 5000,
    "retry": 3
  }
}
EOF
)

# Note: Keycloak doesn't have a direct API for webhook URL configuration
# You need to set this in the admin console or via environment variables

echo "⚠️  IMPORTANT: Webhook URL must be configured manually in Keycloak Admin Console"
echo "   Webhook URL: ${BACKEND_URL}/api/admin/webhooks/email-verification"
echo ""
echo "📋 Manual Steps Required:"
echo "1. Go to Keycloak Admin Console: ${KEYCLOAK_URL}/admin"
echo "2. Navigate to Realm Settings → Events"
echo "3. Add webhook URL: ${BACKEND_URL}/api/admin/webhooks/email-verification"
echo "4. Save the configuration"
echo ""
echo "✅ Keycloak webhook configuration completed!"
echo ""
echo "🧪 Test the webhook:"
echo "1. Create a user invitation via the frontend"
echo "2. Verify the user's email in Keycloak"
echo "3. Check backend logs for webhook events"
echo "4. User should automatically receive organization invitation"
