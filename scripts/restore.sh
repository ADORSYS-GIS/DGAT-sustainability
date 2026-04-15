#!/bin/bash
# =============================================================================
# Restore Script — Sustainability Tool
#
# Usage:
#   ./scripts/restore.sh <path/to/YYYY-MM-DD_HH-MM-SS.tar.gz> [target]
#
#   target (optional, default: all):
#     all       — restore app DB + keycloak DB + .env
#     app       — restore only the app database
#     keycloak  — restore only the keycloak database
#     env       — restore only the .env file
#
# Examples:
#   ./scripts/restore.sh /backups/2026-04-15_02-00-00.tar.gz
#   ./scripts/restore.sh /backups/2026-04-15_02-00-00.tar.gz app
#   ./scripts/restore.sh /backups/2026-04-15_02-00-00.tar.gz keycloak
#
# After restore, restart services:
#   docker compose restart
#
# To manually import the Keycloak realm JSON (if needed):
#   Copy the JSON from the archive into ./infrastructure/keycloak/
#   then: docker compose restart keycloak
# =============================================================================

set -uo pipefail

# ── Resolve repo root ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Args ──────────────────────────────────────────────────────────────────────
ARCHIVE="${1:-}"
TARGET="${2:-all}"
RESTORE_TMP="/tmp/sustainability-restore-$$"

# ── Config ────────────────────────────────────────────────────────────────────
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sustainability}"
KEYCLOAK_DB="${KEYCLOAK_DB:-keycloak}"
APP_DB_HOST="${APP_DB_HOST:-localhost}"
APP_DB_PORT="${APP_DB_PORT:-5431}"
KEYCLOAK_DB_HOST="${KEYCLOAK_DB_HOST:-localhost}"
KEYCLOAK_DB_PORT="${KEYCLOAK_DB_PORT:-5433}"

export PGPASSWORD="$POSTGRES_PASSWORD"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; cleanup; exit 1; }

cleanup() {
  rm -rf "$RESTORE_TMP"
}
trap cleanup EXIT

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ -z "$ARCHIVE" ]]; then
  echo "Usage: $0 <path/to/backup.tar.gz> [all|app|keycloak|env]"
  exit 1
fi

if [[ ! -f "$ARCHIVE" ]]; then
  echo "ERROR: Archive not found: $ARCHIVE"
  exit 1
fi

# ── Extract ───────────────────────────────────────────────────────────────────
log "========================================================"
log "Restore started"
log "Archive: ${ARCHIVE}"
log "Target:  ${TARGET}"
log "========================================================"

mkdir -p "$RESTORE_TMP"
log "Extracting archive..."
# The archive contains a single top-level directory named after the timestamp.
# --strip-components=1 removes that wrapper so files land directly in RESTORE_TMP.
if ! tar -xzf "$ARCHIVE" -C "$RESTORE_TMP" --strip-components=1; then
  fail "Failed to extract archive"
fi
log "Extracted contents:"
ls -lh "$RESTORE_TMP"

# ── Helper: restore one postgres database ────────────────────────────────────
restore_db() {
  local host="$1"
  local port="$2"
  local dbname="$3"
  local dump="$4"

  if [[ ! -f "$dump" ]]; then
    fail "Dump file not found: $dump"
  fi

  log "Restoring '${dbname}' from $(basename "$dump") ..."

  # Terminate active connections, drop, recreate
  # Using separate psql calls to avoid heredoc tab-indentation issues
  psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbname}' AND pid <> pg_backend_pid();" \
    || true  # non-fatal if no connections exist

  psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${dbname};" \
    || fail "Could not drop database '${dbname}'"

  psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d postgres \
    -c "CREATE DATABASE ${dbname};" \
    || fail "Could not create database '${dbname}'"

  pg_restore \
    -h "$host" \
    -p "$port" \
    -U "$POSTGRES_USER" \
    -d "$dbname" \
    --no-owner \
    --role="$POSTGRES_USER" \
    --exit-on-error \
    "$dump" \
    || fail "pg_restore failed for '${dbname}'"

  log "Database '${dbname}' restored OK"
}

# ── Restore functions ─────────────────────────────────────────────────────────
do_app() {
  restore_db "$APP_DB_HOST" "$APP_DB_PORT" "$POSTGRES_DB" "${RESTORE_TMP}/app_db.dump"
}

do_keycloak() {
  restore_db "$KEYCLOAK_DB_HOST" "$KEYCLOAK_DB_PORT" "$KEYCLOAK_DB" "${RESTORE_TMP}/keycloak_db.dump"
}

do_env() {
  if [[ -f "${RESTORE_TMP}/.env.bak" ]]; then
    # Keep a copy of the current .env before overwriting
    if [[ -f "${REPO_ROOT}/.env" ]]; then
      cp "${REPO_ROOT}/.env" "${REPO_ROOT}/.env.before-restore"
      log ".env saved as .env.before-restore"
    fi
    cp "${RESTORE_TMP}/.env.bak" "${REPO_ROOT}/.env"
    log ".env restored to ${REPO_ROOT}/.env"
  else
    log "No .env.bak in archive — skipping"
  fi
}

# ── Run ───────────────────────────────────────────────────────────────────────
case "$TARGET" in
  all)
    do_app
    do_keycloak
    do_env
    ;;
  app)
    do_app
    ;;
  keycloak)
    do_keycloak
    ;;
  env)
    do_env
    ;;
  *)
    fail "Unknown target '${TARGET}'. Valid options: all, app, keycloak, env"
    ;;
esac

# ── Done ──────────────────────────────────────────────────────────────────────
log "========================================================"
log "Restore complete"
log ""
log "Next steps:"
log "  1. docker compose restart"

if [[ -d "${RESTORE_TMP}/keycloak-realm-export" ]]; then
  log ""
  log "  Keycloak realm JSON is in the archive (keycloak-realm-export/)."
  log "  The DB restore should be sufficient, but if users/clients are missing:"
  log "    cp <extracted>/keycloak-realm-export/*.json ./infrastructure/keycloak/"
  log "    docker compose restart keycloak"
fi
log "========================================================"
