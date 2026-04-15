#!/bin/bash
# =============================================================================
# Backup Script — Sustainability Tool
#
# What gets backed up:
#   1. App PostgreSQL database       (pg_dump -F c)
#   2. Keycloak PostgreSQL database  (pg_dump -F c)
#   3. .env file                     (copied as .env.bak)
#   4. Keycloak realm export         (kc.sh export → JSON)
#
# All artifacts are bundled into a single timestamped .tar.gz archive.
#
# Retention:
#   Local  — keeps last BACKUP_RETAIN_DAYS days        (default: 7)
#   Remote — if RCLONE_REMOTE + RCLONE_BUCKET are set,
#            uploads to S3-compatible storage and prunes
#            files older than BACKUP_REMOTE_RETAIN_DAYS (default: 30)
#
# Schedule (add to crontab on the host):
#   0 2 * * * /path/to/scripts/backup.sh >> /var/log/sustainability-backup.log 2>&1
#
# Configurable via environment variables (all have safe defaults):
#   BACKUP_DIR                — archive output dir        (default: <repo>/backups)
#   BACKUP_RETAIN_DAYS        — local retention days      (default: 7)
#   BACKUP_REMOTE_RETAIN_DAYS — remote retention days     (default: 30)
#   RCLONE_REMOTE             — rclone remote name        (e.g. "s3")
#   RCLONE_BUCKET             — bucket/path               (e.g. "my-bucket/sustainability")
#   POSTGRES_USER             — DB user                   (default: postgres)
#   POSTGRES_PASSWORD         — DB password               (default: postgres)
#   POSTGRES_DB               — app database name         (default: sustainability)
#   KEYCLOAK_DB               — keycloak database name    (default: keycloak)
#   APP_DB_HOST               — app DB host               (default: localhost)
#   APP_DB_PORT               — app DB port               (default: 5431)
#   KEYCLOAK_DB_HOST          — keycloak DB host          (default: localhost)
#   KEYCLOAK_DB_PORT          — keycloak DB port          (default: 5433)
#   KEYCLOAK_CONTAINER        — keycloak container name   (default: sustainability-keycloak)
#   KEYCLOAK_REALM            — realm to export           (default: sustainability-realm)
# =============================================================================

set -uo pipefail
# Note: -e is intentionally omitted so individual step failures are handled
# explicitly and the script can still package whatever was collected.

# ── Ensure pg tools are on PATH (cron has a minimal environment) ──────────────
export PATH="/usr/lib/postgresql/17/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# ── Resolve script/repo root ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Config ────────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
REMOTE_RETAIN_DAYS="${BACKUP_REMOTE_RETAIN_DAYS:-30}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BUNDLE_DIR="${BACKUP_DIR}/${TIMESTAMP}"
ARCHIVE="${BACKUP_DIR}/${TIMESTAMP}.tar.gz"
ERRORS=0

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sustainability}"
KEYCLOAK_DB="${KEYCLOAK_DB:-keycloak}"
# Default to localhost + exposed ports (running from host, not inside Docker)
APP_DB_HOST="${APP_DB_HOST:-localhost}"
APP_DB_PORT="${APP_DB_PORT:-5431}"
KEYCLOAK_DB_HOST="${KEYCLOAK_DB_HOST:-localhost}"
KEYCLOAK_DB_PORT="${KEYCLOAK_DB_PORT:-5433}"
KEYCLOAK_CONTAINER="${KEYCLOAK_CONTAINER:-sustainability-keycloak}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-sustainability-realm}"

export PGPASSWORD="$POSTGRES_PASSWORD"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN:  $*" >&2; }
err()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; ERRORS=$((ERRORS + 1)); }

mkdir -p "$BUNDLE_DIR"
log "========================================================"
log "Backup started — ${TIMESTAMP}"
log "Archive target: ${ARCHIVE}"
log "========================================================"

# ── 1. App database ───────────────────────────────────────────────────────────
log "[1/4] Dumping app database: ${POSTGRES_DB} @ ${APP_DB_HOST}:${APP_DB_PORT}"
if pg_dump \
    -h "$APP_DB_HOST" \
    -p "$APP_DB_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -F c \
    -f "${BUNDLE_DIR}/app_db.dump"; then
  log "      OK — $(du -sh "${BUNDLE_DIR}/app_db.dump" | cut -f1)"
else
  err "App DB dump FAILED"
fi

# ── 2. Keycloak database ──────────────────────────────────────────────────────
log "[2/4] Dumping keycloak database: ${KEYCLOAK_DB} @ ${KEYCLOAK_DB_HOST}:${KEYCLOAK_DB_PORT}"
if pg_dump \
    -h "$KEYCLOAK_DB_HOST" \
    -p "$KEYCLOAK_DB_PORT" \
    -U "$POSTGRES_USER" \
    -d "$KEYCLOAK_DB" \
    -F c \
    -f "${BUNDLE_DIR}/keycloak_db.dump"; then
  log "      OK — $(du -sh "${BUNDLE_DIR}/keycloak_db.dump" | cut -f1)"
else
  err "Keycloak DB dump FAILED"
fi

# ── 3. .env file ──────────────────────────────────────────────────────────────
log "[3/4] Backing up .env"
if [[ -f "${REPO_ROOT}/.env" ]]; then
  cp "${REPO_ROOT}/.env" "${BUNDLE_DIR}/.env.bak"
  log "      OK — ${REPO_ROOT}/.env → .env.bak"
else
  warn ".env not found at ${REPO_ROOT}/.env — skipping"
fi

# ── 4. Keycloak realm export ──────────────────────────────────────────────────
log "[4/4] Exporting Keycloak realm: ${KEYCLOAK_REALM}"
if docker inspect "$KEYCLOAK_CONTAINER" &>/dev/null; then
  mkdir -p "${BUNDLE_DIR}/keycloak-realm-export"
  # Run export inside the container; suppress verbose Keycloak startup noise
  if docker exec "$KEYCLOAK_CONTAINER" \
      /opt/keycloak/bin/kc.sh export \
      --dir /tmp/kc-export \
      --realm "$KEYCLOAK_REALM" \
      --users realm_file 2>&1 | grep -v "^[0-9]\{4\}-" | grep -v "^$"; then
    docker cp "${KEYCLOAK_CONTAINER}:/tmp/kc-export/." "${BUNDLE_DIR}/keycloak-realm-export/"
    docker exec "$KEYCLOAK_CONTAINER" rm -rf /tmp/kc-export 2>/dev/null || true
    log "      OK — realm JSON exported"
  else
    warn "Keycloak realm export failed — skipping (DB backup still valid)"
    rmdir "${BUNDLE_DIR}/keycloak-realm-export" 2>/dev/null || true
  fi
else
  warn "Container '${KEYCLOAK_CONTAINER}' not found — skipping realm export"
fi

# ── Package into .tar.gz ──────────────────────────────────────────────────────
log "Packaging archive..."
if tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$TIMESTAMP"; then
  rm -rf "$BUNDLE_DIR"
  log "Archive ready: ${ARCHIVE} ($(du -sh "$ARCHIVE" | cut -f1))"
else
  err "Failed to create archive — bundle left at ${BUNDLE_DIR}"
fi

# ── Local retention ───────────────────────────────────────────────────────────
log "Pruning local backups older than ${RETAIN_DAYS} days..."
find "$BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" -mtime +"${RETAIN_DAYS}" -delete
log "Current local archives:"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || log "  (none)"

# ── Off-site upload via rclone (optional) ─────────────────────────────────────
if [[ -n "${RCLONE_REMOTE:-}" && -n "${RCLONE_BUCKET:-}" ]]; then
  if command -v rclone &>/dev/null; then
    log "Uploading to ${RCLONE_REMOTE}:${RCLONE_BUCKET}/ ..."
    if rclone copy "$ARCHIVE" "${RCLONE_REMOTE}:${RCLONE_BUCKET}/"; then
      log "Remote upload OK"
      log "Pruning remote files older than ${REMOTE_RETAIN_DAYS} days..."
      rclone delete --min-age "${REMOTE_RETAIN_DAYS}d" "${RCLONE_REMOTE}:${RCLONE_BUCKET}/" \
        || warn "Remote pruning failed — check rclone config"
    else
      err "Remote upload FAILED"
    fi
  else
    warn "rclone not installed — skipping remote upload"
  fi
else
  log "RCLONE_REMOTE/RCLONE_BUCKET not configured — skipping remote upload"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log "========================================================"
if [[ $ERRORS -gt 0 ]]; then
  log "Backup finished with ${ERRORS} ERROR(s) — review logs above"
  log "========================================================"
  exit 1
fi
log "Backup complete — no errors"
log "========================================================"
