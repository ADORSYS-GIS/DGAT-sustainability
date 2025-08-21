#!/bin/bash

# Configure Keycloak Webhook URL via System Properties
echo "🔧 Configuring Keycloak Webhook URL..."

# Stop Keycloak if running
echo "📦 Stopping Keycloak..."
docker-compose stop keycloak

# Set webhook URL via environment variable
export KC_SPI_EVENTS_LISTENER_WEBHOOK_URL="http://backend:3001/api/admin/webhooks/email-verification"
export KC_SPI_EVENTS_LISTENER_WEBHOOK_TIMEOUT="5000"
export KC_SPI_EVENTS_LISTENER_WEBHOOK_RETRY="3"

echo "✅ Webhook URL configured: $KC_SPI_EVENTS_LISTENER_WEBHOOK_URL"

# Start Keycloak with webhook configuration
echo "🚀 Starting Keycloak with webhook configuration..."
docker-compose up -d keycloak

echo "✅ Keycloak restarted with webhook configuration"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Keycloak Admin Console: http://localhost:8080/admin"
echo "2. Navigate to Realm Settings → Events"
echo "3. Verify 'webhook' is in the Event listeners list"
echo "4. Test the complete flow by creating a user invitation"
