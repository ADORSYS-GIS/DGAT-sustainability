#!/bin/bash

set -euo pipefail

echo "Starting Keycloak setup script..."

# Make scripts executable
chmod +x /opt/keycloak/setup-scripts/*.sh

# Run setup scripts in background to avoid blocking Keycloak startup
(sleep 10 && /opt/keycloak/setup-scripts/admin.sh) &

# Start Keycloak with original parameters
echo "Starting Keycloak..."
exec /opt/keycloak/bin/kc.sh "$@"
