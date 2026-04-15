# Backup & Restore Strategy — Sustainability Tool

## Overview

The backup strategy covers all stateful data in the application. Each backup run
produces a single compressed archive containing four artifacts, stored locally
with automatic retention and optional off-site upload.

The scripts live in `scripts/` and run directly on the host machine — no changes
to the Docker Compose setup are required.

---

## What Gets Backed Up

| # | Artifact | Source | File in archive |
|---|----------|--------|-----------------|
| 1 | App database | `sustainability-db` container (port 5431) | `app_db.dump` |
| 2 | Keycloak database | `sustainability-keycloak-db` container (port 5433) | `keycloak_db.dump` |
| 3 | Environment config | `.env` in repo root | `.env.bak` |
| 4 | Keycloak realm export | `kc.sh export` inside `sustainability-keycloak` | `keycloak-realm-export/*.json` |

Both databases are dumped using `pg_dump -F c` (PostgreSQL custom format), which
is compressed, supports parallel restore, and is the most reliable format for
`pg_restore`.

The Keycloak realm export is a portable JSON snapshot of the entire realm
(users, roles, clients, identity providers, groups). It is a safety net on top
of the DB dump — in most cases the DB restore alone is sufficient.

---

## Archive Format

Each backup produces a single `.tar.gz` file named after the timestamp:

```
backups/
  2026-04-15_02-00-00.tar.gz
  2026-04-16_02-00-00.tar.gz
  ...
```

Inside each archive:

```
2026-04-15_02-00-00/
  app_db.dump
  keycloak_db.dump
  .env.bak
  keycloak-realm-export/
    sustainability-realm-users-0.json
```

---

## Retention Policy

| Scope | Default | Override |
|-------|---------|----------|
| Local | 7 days | `BACKUP_RETAIN_DAYS` |
| Remote (off-site) | 30 days | `BACKUP_REMOTE_RETAIN_DAYS` |

Archives older than the retention period are deleted automatically at the end of
each backup run.

---

## Prerequisites

The following must be installed on the host machine running the scripts:

- `pg_dump` / `pg_restore` / `psql` — PostgreSQL client tools (must match or be
  compatible with the server version, currently PostgreSQL 17)
- `docker` — to run the Keycloak realm export
- `rclone` — only required for off-site upload (optional)

Install PostgreSQL client tools on Debian/Ubuntu:

```bash
sudo apt-get install -y postgresql-client
```

---

## Configuration

All configuration is done via environment variables. The scripts read from the
shell environment, so you can either export them in your shell or prefix the
command.

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `<repo>/backups` | Directory where archives are stored |
| `BACKUP_RETAIN_DAYS` | `7` | Days to keep local archives |
| `BACKUP_REMOTE_RETAIN_DAYS` | `30` | Days to keep remote archives |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `sustainability` | App database name |
| `KEYCLOAK_DB` | `keycloak` | Keycloak database name |
| `APP_DB_HOST` | `localhost` | App DB host (host-side) |
| `APP_DB_PORT` | `5431` | App DB port (host-side exposed port) |
| `KEYCLOAK_DB_HOST` | `localhost` | Keycloak DB host (host-side) |
| `KEYCLOAK_DB_PORT` | `5433` | Keycloak DB port (host-side exposed port) |
| `KEYCLOAK_CONTAINER` | `sustainability-keycloak` | Keycloak container name |
| `KEYCLOAK_REALM` | `sustainability-realm` | Realm to export |
| `RCLONE_REMOTE` | _(unset)_ | rclone remote name (e.g. `s3`) |
| `RCLONE_BUCKET` | _(unset)_ | Bucket/path on the remote |

---

## Running a Backup

Make the scripts executable (one-time):

```bash
chmod +x scripts/backup.sh scripts/restore.sh
```

Run a manual backup:

```bash
./scripts/backup.sh
```

The script logs each step to stdout. A successful run looks like:

```
[2026-04-15 02:00:01] ========================================================
[2026-04-15 02:00:01] Backup started — 2026-04-15_02-00-01
[2026-04-15 02:00:01] Archive target: /path/to/backups/2026-04-15_02-00-01.tar.gz
[2026-04-15 02:00:01] ========================================================
[2026-04-15 02:00:01] [1/4] Dumping app database: sustainability @ localhost:5431
[2026-04-15 02:00:02]       OK — 1.2M
[2026-04-15 02:00:02] [2/4] Dumping keycloak database: keycloak @ localhost:5433
[2026-04-15 02:00:03]       OK — 856K
[2026-04-15 02:00:03] [3/4] Backing up .env
[2026-04-15 02:00:03]       OK — /path/to/.env → .env.bak
[2026-04-15 02:00:03] [4/4] Exporting Keycloak realm: sustainability-realm
[2026-04-15 02:00:08]       OK — realm JSON exported
[2026-04-15 02:00:08] Packaging archive...
[2026-04-15 02:00:08] Archive ready: /path/to/backups/2026-04-15_02-00-01.tar.gz (980K)
[2026-04-15 02:00:08] Backup complete — no errors
```

The script exits with code `0` on success and `1` if any step failed. Failed
steps are logged as `ERROR` but the script continues so partial backups are
still packaged.

---

## Scheduling (Cron)

Add a crontab entry on the host to run the backup automatically every day at
2:00 AM:

```bash
crontab -e
```

Add this line (adjust the path to match your deployment):

```
0 2 * * * /path/to/DGAT-sustainability/scripts/backup.sh >> /var/log/sustainability-backup.log 2>&1
```

To verify the cron job is registered:

```bash
crontab -l
```

---

## Off-site Upload (Optional)

If `RCLONE_REMOTE` and `RCLONE_BUCKET` are set, the script uploads the archive
to any S3-compatible storage after each backup run (AWS S3, Backblaze B2,
MinIO, etc.).

1. Install rclone: https://rclone.org/install/
2. Configure a remote:
   ```bash
   rclone config
   ```
3. Export the variables before running (or add to crontab):
   ```bash
   export RCLONE_REMOTE=s3
   export RCLONE_BUCKET=my-bucket/sustainability
   ./scripts/backup.sh
   ```

Remote files older than `BACKUP_REMOTE_RETAIN_DAYS` (default 30) are pruned
automatically after each successful upload.

---

## Restore

### Full restore (app DB + Keycloak DB + .env)

```bash
./scripts/restore.sh /path/to/backups/2026-04-15_02-00-00.tar.gz
```

### Restore only the app database

```bash
./scripts/restore.sh /path/to/backups/2026-04-15_02-00-00.tar.gz app
```

### Restore only the Keycloak database

```bash
./scripts/restore.sh /path/to/backups/2026-04-15_02-00-00.tar.gz keycloak
```

### Restore only the .env file

```bash
./scripts/restore.sh /path/to/backups/2026-04-15_02-00-00.tar.gz env
```

### What the restore script does

1. Extracts the archive to a temporary directory
2. For each database target:
   - Terminates all active connections to the database
   - Drops the existing database
   - Creates a fresh empty database
   - Runs `pg_restore` to load the dump
3. Copies `.env.bak` back to the repo root as `.env` (the previous `.env` is
   saved as `.env.before-restore` automatically)
4. Cleans up the temporary directory

After restore completes, restart the services:

```bash
docker compose restart
```

### Keycloak realm JSON (manual import)

The realm export JSON is included in every archive under
`keycloak-realm-export/`. In most cases the Keycloak DB restore is sufficient
and the JSON is not needed. If users or clients are missing after restore, copy
the JSON into the import directory and restart Keycloak:

```bash
# Extract the JSON from the archive manually
tar -xzf /path/to/backup.tar.gz --strip-components=2 \
  -C ./infrastructure/keycloak/ \
  "*/keycloak-realm-export/"

docker compose restart keycloak
```

---

## Volume Isolation

The app database and Keycloak database use separate Docker volumes:

| Volume | Container | Data |
|--------|-----------|------|
| `postgres-data` | `sustainability-db` | All app data (assessments, submissions, reports, etc.) |
| `keycloak-postgres-data` | `sustainability-keycloak-db` | Users, roles, clients, sessions |

This means you can wipe one without affecting the other:

```bash
# Remove only app data
docker compose down
docker volume rm dgat-sustainability_postgres-data
docker compose up -d

# Remove only Keycloak data
docker compose down
docker volume rm dgat-sustainability_keycloak-postgres-data
docker compose up -d
```

---

## Recovery Scenarios

### Scenario 1 — Accidental data deletion

Run a restore targeting only the app database:

```bash
./scripts/restore.sh /path/to/latest-backup.tar.gz app
docker compose restart backend
```

### Scenario 2 — Full instance failure (new server)

1. Install Docker and Docker Compose on the new server
2. Clone the repository
3. Copy your latest backup archive to the new server
4. Run the full restore:
   ```bash
   ./scripts/restore.sh /path/to/latest-backup.tar.gz
   ```
5. Bring services up:
   ```bash
   docker compose up -d
   ```

### Scenario 3 — Keycloak users lost

```bash
./scripts/restore.sh /path/to/latest-backup.tar.gz keycloak
docker compose restart keycloak
```

### Scenario 4 — Wrong password / .env mismatch

```bash
./scripts/restore.sh /path/to/latest-backup.tar.gz env
docker compose restart
```

---

## Verifying a Backup

To inspect the contents of an archive without restoring:

```bash
tar -tzf /path/to/backups/2026-04-15_02-00-00.tar.gz
```

To verify a dump file is valid:

```bash
# Extract the dump first
tar -xzf /path/to/backup.tar.gz --strip-components=1 -C /tmp/verify/

# Check the app dump
pg_restore --list /tmp/verify/app_db.dump | head -20

# Check the keycloak dump
pg_restore --list /tmp/verify/keycloak_db.dump | head -20
```
