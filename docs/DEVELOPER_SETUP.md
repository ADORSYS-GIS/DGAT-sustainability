# Developer Setup Guide — DGAT Sustainability Tool

This guide gets a new developer from a fresh clone to a running local stack,
explains how to work on the frontend and backend, regenerate the OpenAPI
client, run tests, and understand the day-to-day development workflow.

> For the full system architecture see [ARCHITECTURE.md](ARCHITECTURE.md);
> for roles see [RBAC_ROLES.md](RBAC_ROLES.md); for deployment see
> [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Docker | 24+ | Runs the whole stack via `docker compose` |
| Docker Compose | v2+ | Orchestrates services |
| Node.js | 20+ | Frontend dev tooling (optional if only using containers) |
| npm | 10+ | Frontend dependency + script runner |
| Rust | 1.88 stable | Backend dev (optional if only using containers) |
| PostgreSQL client | 17 | Backup/restore tools, manual DB access |
| Git | 2.x | Source control |

### Install tips (Ubuntu/Debian)

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default 1.88.0

# PostgreSQL client (17)
sudo apt-get install -y postgresql-client-17

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 2. First-Time Local Setup

```bash
git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git
cd DGAT-sustainability

# 1. Create your local environment file (gitignored — never commit secrets)
cp .env.example .env

# 2. Generate self-signed SSL certs for local HTTPS
SERVER_DN=localhost ./scripts/generate_ssl.sh

# 3. Start the full stack (DB, Keycloak, backend, migrations, OpenAPI fetcher, frontend)
docker compose up -d

# 4. Watch the services come up
docker compose ps
docker compose logs -f
```

Once healthy:

| Service | URL |
|---------|-----|
| Frontend PWA | https://localhost:8443 |
| Keycloak admin | https://localhost:8081/keycloak (admin / admin123) |
| Backend health | http://localhost:3002/api/health |
| OpenAPI spec | http://localhost:3002/api/openapi.json |

### What starts automatically

1. **`db`** and **`keycloak-db`** — two PostgreSQL 17 instances with health
   checks (`pg_isready`).
2. **`migrate`** — one-shot container running `db-migrator`, which applies all
   SeaORM migrations, then exits (`service_completed_successfully`). The
   backend waits for this.
3. **`keycloak`** — imports `infrastructure/keycloak/realm-export.json` via
   `--import-realm`, then `keycloak-startup.sh` runs `admin.sh` once to
   provision the default admin user and SMTP settings.
4. **`backend`** — Axum server on port 3001 (host 3002). Reads `CONFIG` from
   env (`Configs::new()` in `backend/src/common/config.rs`).
5. **`openapi-fetcher`** — Node 18 container that waits for the backend health
   check, fetches `/api/openapi.json`, and writes it to the shared
   `openapi-volume`.
6. **`frontend`** — Nginx serves the built SPA; waits for `openapi.json` in the
   shared volume before starting so the generated client always matches the
   backend spec.

---

## 3. Default Login Users

After first startup, the realm contains the seeded admin user created by
`scripts/admin.sh`:

| Email | Username | Password | Roles |
|-------|----------|----------|-------|
| `360@dgrv.coop` | `360@dgrv.coop` | `dgrv@coop360` (temporary — must change on first login) | `application_admin`, `drgv_admin`, all `realm-management` client roles |

Log in at https://localhost:8443 with this account to reach the admin console.
To create cooperative users, use the admin pages or the invitation endpoints
(see [user-invitation-flow.md](user-invitation-flow.md)).

---

## 4. Working on the Backend (Rust)

### Source layout

```
backend/src/
├── main.rs                      # entrypoint: load config, init DB, build app, serve
├── lib.rs                       # crate root
├── common/
│   ├── config.rs                # envconfig-based Configs (Keycloak, server, CORS)
│   ├── cache.rs                 # SessionCache (request-scoped)
│   ├── state.rs                 # AppDatabase wrapper
│   ├── database/
│   │   ├── entity/              # SeaORM entities (one per table)
│   │   ├── migrations/          # forward-only SeaORM migrations
│   │   └── init.rs              # DB connection init
│   ├── models/
│   │   └── claims.rs            # JWT Claims struct + role helper methods
│   └── services/
│       └── keycloak_service.rs  # Keycloak Admin REST API client
└── web/
    ├── routes.rs                # create_app + auth middleware + CORS + health
    ├── api/
    │   ├── routes.rs            # create_router — all API routes
    │   ├── handlers/           # one handler module per domain
    │   ├── models.rs            # request/response DTOs
    │   └── error.rs             # ApiError type
    └── handlers/
        ├── jwt_validator.rs     # JWT signature validation via Keycloak JWKS
        ├── midlw.rs             # auth_middleware + role guard factories
        └── request_logging.rs   # request logging middleware
```

### Run a local dev server (outside Docker)

```bash
cd backend
cp ../.env .
cargo run --bin sustainability-tool        # API server on :3001
# In another terminal, run migrations manually if needed:
cargo run --bin db-migrator
```

The backend expects `DATABASE_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`,
`KEYCLOAK_CLIENT_ID`, `KEYCLOAK_EXPECTED_ISSUER`, `CORS_ORIGIN`, `SERVER_HOST`,
`SERVER_PORT`, `RUST_LOG` — all read by `Configs::new()` from `.env` or the
environment.

### Adding a new endpoint

1. Add the handler function in the relevant module under
   `backend/src/web/api/handlers/`. Extract `Claims` via
   `get_claims_from_request(request)` and enforce scope checks (see
   [RBAC_ROLES.md](RBAC_ROLES.md)).
2. Register the route in `backend/src/web/api/routes.rs::create_router`.
3. Add/annotate the `utoipa` path decorator on the handler so it shows up in
   the OpenAPI spec (`/api/openapi.json`).
4. Re-run the frontend codegen (see §5) so the TypeScript client picks up the
   new endpoint.
5. Add tests under `backend/tests/` and run `cargo nextest run`.

### Adding a database migration

```bash
# Naming convention: mYYYYMMDD_HHMMSS_snake_case_description.rs
# under backend/src/common/migrations/
```

Then register the new module in `backend/src/common/migrations/mod.rs`:
add the `mod` declaration and push the `Box::new(...)` into the
`MigratorTrait::migrations()` vector in the correct order. See
[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) §5.

> Migrations are forward-only. There is no automatic down migration. To
> revert, restore the previous DB backup.

### Backend test commands

```bash
cd backend
cargo fmt --all --check                 # format check (CI enforces)
cargo clippy --workspace --all-targets --all-features -- -D warnings  # lint (CI enforces)
cargo nextest run --no-fail-fast        # tests (CI enforces)
cargo doc --no-deps                     # docs build (CI enforces)
```

---

## 5. Working on the Frontend (React / Vite)

### Source layout

```
frontend/src/
├── main.tsx / App.tsx               # app bootstrap
├── router/                          # AppRouter, ProtectedRoute, routes
├── pages/
│   ├── admin/                         # drgv_admin-only pages
│   └── user/                          # org_admin / Org_User pages
├── components/
│   ├── shared/                        # navbar, modals, sync status, ...
│   └── ui/                            # shadcn/Radix primitives
├── hooks/                             # data hooks + offline hooks
├── services/                          # apiInterceptor, indexeddb, sync, auth
├── openapi-rq/                        # auto-generated TypeScript API client
├── i18n/                             # i18next + locale JSON
├── constants/roles.ts                # ROLES constants
├── contexts/AuthContext.tsx          # auth provider
└── types/offline.ts                  # offline data shapes
```

### Dev commands

```bash
cd frontend
npm ci                                # install dependencies
npm run dev                           # Vite dev server (hot reload)
npm run build                         # production build
npm run lint:check                    # ESLint (CI enforces)
npm run prettier:check                # Prettier (CI enforces)
npm run ts:check                      # tsc type-check (CI enforces)
npm run test:unit                     # Vitest unit tests (CI enforces)
npm run coverage                      # coverage report
```

### Regenerating the OpenAPI client

The frontend API client (`frontend/src/openapi-rq/`) is **generated** from the
backend's `/api/openapi.json`. When you change the backend API:

```bash
# Option A — from the running Docker stack (the openapi-fetcher already did this)
cp <openapi-fetcher output>/openapi.json frontend/openapi.json

# Option B — generate locally against a running backend
cd frontend
npm run codegen
```

`npm run codegen` reads `frontend/openapi.json` and regenerates
`src/openapi-rq/requests/{types,schemas,services}.gen.ts` plus the query hooks.
**Never hand-edit generated files** — they are overwritten on the next
codegen run and are checked into git so PRs surface contract changes.

### Adding a new admin page

1. Create the component in `frontend/src/pages/admin/`.
2. Lazy-import it in `frontend/src/router/routes.ts` and add it under the
   `/admin` protected route group with `allowedRoles: [ROLES.ADMIN]`
   (see [RBAC_ROLES.md](RBAC_ROLES.md) §4.3).
3. Call the generated API client hooks in `frontend/src/openapi-rq/queries/`.
4. Add any new strings to every locale JSON in `frontend/src/i18n/locales/`
   (en, fr, pt, de, ar, ss, zu).
5. Add a Vitest unit test under `frontend/src/pages/<area>/__tests__/`.

---

## 6. OpenAPI Codegen Contract

The type-safety contract between frontend and backend is enforced by codegen:

```
backend handlers ──(utoipa @path decorators)──> /api/openapi.json
        │                                            │
        │                                   openapi-fetcher (Docker)
        │                                            ▼
        └──────────────────────────────> frontend/openapi.json
                                                     │
                                            npm run codegen
                                                     ▼
                                  frontend/src/openapi-rq/requests/*.gen.ts
                                                     │
                                            queries.ts hooks
                                                     ▼
                                            React components
```

CI regenerates the client on every PR (`openapi_codegen` job), so a backend
API change that breaks the frontend contract fails the `frontend_typescript`,
`frontend_build`, or `frontend_lint` jobs. Keep `frontend/openapi.json` in
sync when working locally.

---

## 7. Keycloak Local Configuration

- Realm: `sustainability-realm` (imported from
  `infrastructure/keycloak/realm-export.json` on first start).
- Client: `sustainability-tool` (public OIDC client used by the frontend).
- Realm roles: `application_admin`, `drgv_admin`, `org_admin`, `Org_User`
  (see [RBAC_ROLES.md](RBAC_ROLES.md)).
- Keycloak Organizations preview feature: enabled via
  `KC_FEATURES=preview,organization` in `docker-compose.yml`.
- SMTP: configured by `scripts/admin.sh` from the `EMAIL_*` env vars in `.env`
  — required for user invitation emails to be delivered.

### Resetting Keycloak to defaults

```bash
docker compose down keycloak keycloak-db
docker volume rm dgat-sustainability_keycloak-postgres-data
docker compose up -d keycloak-db keycloak
# The first-time provisioning guard (.provisioned) inside the keycloak bin
# dir will re-run admin.sh and recreate the seeded admin user.
```

---

## 8. Database Access (local)

Database ports are bound to `127.0.0.1` only:

| Database | Host port | Container | Connect |
|----------|-----------|-----------|---------|
| App DB | 5431 | `sustainability-db` | `psql -h 127.0.0.1 -p 5431 -U postgres -d sustainability` |
| Keycloak DB | 5433 | `sustainability-keycloak-db` | `psql -h 127.0.0.1 -p 5433 -U postgres -d keycloak` |

Default password is `postgres` (from `.env.example`). The schema is documented
in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

---

## 9. Offline-First Development Notes

When adding or modifying data flows:

- All reference data (questions, categories, organizations) is mirrored into
  IndexedDB by `services/initialDataLoader.ts` on login.
- Mutations while offline are written to IndexedDB and pushed onto the
  `syncQueue` by `services/syncQueueService.ts`.
- On reconnect, `services/syncService.ts` drains the queue against the
  backend and reconciles server state.
- The service worker (`src/sw.ts`, Workbox) precaches the app shell.

Always test offline→online transitions locally (DevTools → Application →
Service Workers → Offline). See [OFFLINE_ARCHITECTURE.md](OFFLINE_ARCHITECTURE.md).

---

## 10. Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) and
[QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md) for the full testing strategy.

Run everything locally before pushing:

```bash
# Backend
cd backend && cargo fmt --check && cargo clippy -- -D warnings && cargo nextest run

# Frontend
cd frontend && npm run lint:check && npm run prettier:check && npm run ts:check && npm run test:unit
```

CI enforces all of the above on every pull request (see
[CICD_PIPELINE.md](CICD_PIPELINE.md)).

---

## 11. Common Issues

| Symptom | Cause / Fix |
|---------|-------------|
| Frontend never starts, "Waiting for openapi.json..." | Backend not healthy. Check `docker compose logs backend` and `docker compose ps`. |
| `401 Unauthorized` on all /api calls after login | Clock skew between host and containers, or `KEYCLOAK_EXPECTED_ISSUER` mismatch in `.env`. |
| Browser HTTPS warning | Expected — self-signed cert (`scripts/generate_ssl.sh`). Accept the risk locally. |
| Keycloak login loop after clearing IndexedDB | SSO session still valid in Keycloak; see `frontend/docs/Keycloak.md`. |
| Migration fails on schema change | Forward-only migrations; if a drift exists, reset the volume: `docker volume rm dgat-sustainability_postgres-data` then `docker compose up -d`. **This wipes app data** — back up first. |
| Email invitations not delivered | `EMAIL_*` env vars in `.env` are defaults/invalid. Configure real SMTP credentials. |