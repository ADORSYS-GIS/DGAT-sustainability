#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYCLOAK_START_CMD="${KEYCLOAK_START_CMD:-/opt/keycloak/bin/kc.sh start}"
PROVISION_DONE_FILE="/opt/keycloak/bin/.provisioned"

log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }

log "Starting Keycloak with: $KEYCLOAK_START_CMD"
bash -lc "$KEYCLOAK_START_CMD" &
KC_PID=$!

cleanup() {
  log "Forwarding termination to Keycloak (PID $KC_PID)"
  kill -TERM "$KC_PID" 2>/dev/null || true
  wait "$KC_PID" || true
}
trap cleanup INT TERM

# Wait for Keycloak to be ready
"$SCRIPT_DIR/admin.sh" --wait-only || true

# Only run full provisioning once (guard file persists in the volume)
if [ ! -f "$PROVISION_DONE_FILE" ]; then
  log "Running first-time provisioning..."
  if "$SCRIPT_DIR/admin.sh"; then
    touch "$PROVISION_DONE_FILE" 2>/dev/null || true
    log "Provisioning complete. Guard file written."
  else
    log "Provisioning failed — will retry on next restart."
  fi
else
  log "Provisioning already done, skipping."
fi

# Keep the container alive with Keycloak in foreground
wait "$KC_PID"
