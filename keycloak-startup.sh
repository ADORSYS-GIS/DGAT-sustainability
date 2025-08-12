#!/bin/bash
set -euo pipefail
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYCLOAK_START_CMD="${KEYCLOAK_START_CMD:-/opt/keycloak/bin/kc.sh start}"

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

# Wait for readiness and run provisioning
bash "$SCRIPT_DIR/a.sh" --wait-only || true
bash "$SCRIPT_DIR/a.sh" || true

# Keep the container/process alive with Keycloak in foreground
wait "$KC_PID"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYCLOAK_START_CMD="${KEYCLOAK_START_CMD:-/opt/keycloak/bin/kc.sh start}"

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

# Wait for readiness and run provisioning
"$SCRIPT_DIR/a.sh" --wait-only || true
"$SCRIPT_DIR/a.sh" || true

# Keep the container/process alive with Keycloak in foreground
wait "$KC_PID"
