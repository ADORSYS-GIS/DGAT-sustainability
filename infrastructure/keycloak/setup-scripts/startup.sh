#!/bin/bash

set -euo pipefail

echo "Starting Keycloak setup script..."

# Copy scripts to a writable location and make them executable
mkdir -p /tmp/keycloak-scripts
cp /opt/keycloak/setup-scripts/*.sh /tmp/keycloak-scripts/
chmod +x /tmp/keycloak-scripts/*.sh

# Run setup scripts in background to avoid blocking Keycloak startup
(sleep 10 && /tmp/keycloak-scripts/admin.sh) &

# Start Keycloak with original parameters
echo "Starting Keycloak..."
exec /opt/keycloak/bin/kc.sh "$@"
