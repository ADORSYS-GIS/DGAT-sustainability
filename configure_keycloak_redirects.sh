#!/bin/bash

# Configure Keycloak Client Redirect URIs for Email Verification
# This script configures the client to redirect to your app after email verification

set -e

# Configuration
KEYCLOAK_URL="http://localhost:8080"
REALM="sustainability-realm"  # Change this to your realm name
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"  # Change this to your admin password
CLIENT_ID="sustainability-app"  # Change this to your client ID
APP_URL="http://localhost:5173"  # Change this to your app URL

echo "🔧 Configuring Keycloak Client Redirect URIs"
echo "============================================"

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

# Get client details
echo "🔍 Getting client details..."
CLIENT_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json")

# Find the client by clientId
CLIENT_UUID=$(echo "$CLIENT_RESPONSE" | jq -r ".[] | select(.clientId == \"${CLIENT_ID}\") | .id")

if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
    echo "❌ Client '${CLIENT_ID}' not found. Available clients:"
    echo "$CLIENT_RESPONSE" | jq -r '.[].clientId'
    exit 1
fi

echo "✅ Found client: ${CLIENT_ID} (UUID: ${CLIENT_UUID})"

# Get current client configuration
echo "📋 Getting current client configuration..."
CURRENT_CONFIG=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json")

# Update client configuration with redirect URIs
echo "🔄 Updating client configuration..."
UPDATED_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg app_url "$APP_URL" '
  .redirectUris = [$app_url + "/*", $app_url + "/", $app_url + "/dashboard", $app_url + "/admin"] |
  .webOrigins = [$app_url, "+"] |
  .attributes."post.logout.redirect.uris" = $app_url + "/*" |
  .attributes."login.redirect.uris" = $app_url + "/*"
')

# Update the client
RESPONSE=$(curl -s -w "%{http_code}" -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_CONFIG")

HTTP_CODE="${RESPONSE: -3}"
RESPONSE_BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Client configuration updated successfully"
    echo ""
    echo "📋 Updated Redirect URIs:"
    echo "   - ${APP_URL}/*"
    echo "   - ${APP_URL}/"
    echo "   - ${APP_URL}/dashboard"
    echo "   - ${APP_URL}/admin"
    echo ""
    echo "📋 Updated Web Origins:"
    echo "   - ${APP_URL}"
    echo "   - + (allows all origins for development)"
    echo ""
    echo "🎯 Now when users verify their email, they will be redirected to your app!"
else
    echo "❌ Failed to update client configuration. HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "📋 Manual Steps (if needed):"
echo "1. Go to Keycloak Admin Console: ${KEYCLOAK_URL}/admin"
echo "2. Navigate to Clients → ${CLIENT_ID} → Settings"
echo "3. Verify Redirect URIs include: ${APP_URL}/*"
echo "4. Verify Web Origins include: ${APP_URL}"
echo ""
echo "🧪 Test the flow:"
echo "1. Create a user invitation"
echo "2. Check email for verification link"
echo "3. Click verification link"
echo "4. User should be redirected to your app"
