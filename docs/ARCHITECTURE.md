# System Architecture — DGAT Sustainability Tool

## 1. Overview

The DGAT Sustainability Tool is a web application that allows cooperatives in
Southern Africa to evaluate their sustainability performance across
environmental, financial, and governance dimensions. It is delivered as an
offline-capable **Progressive Web App (PWA)** backed by a **Rust** REST API.

The entire system runs on a **single EC2 host** via Docker Compose, fronted by
**Cloudflare** (DNS, CDN, WAF, DDoS protection, TLS termination) and an
**Nginx** reverse proxy. Authentication and identity management are handled by
**Keycloak** (OAuth2 / OIDC). Application data and identity data are stored in
two isolated **PostgreSQL 17** databases.

### Design goals

| Goal | How it is achieved |
|------|--------------------|
| Offline-first for field workers | PWA with IndexedDB + service worker (Workbox) |
| Type safety across the stack | Rust (backend), TypeScript (frontend), OpenAPI codegen |
| Strong security / multi-tenancy | Keycloak OAuth2/OIDC, JWT validation, RBAC |
| Low resource footprint | Rust backend, multi-stage Docker images |
| Multilingual content | i18next with 7 locales (en, fr, pt, de, ar, ss, zu) |
| Simple single-host ops | Docker Compose orchestration, backup/restore scripts |

---

## 2. Technology Stack

### 2.1 Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | Rust | 1.88.0 (stable) | Core API server |
| Framework | Axum | 0.7 | HTTP server & routing |
| ORM | SeaORM | 1.1 | Database access layer (PostgreSQL) |
| Auth | Keycloak | 26.3.1 | Identity & access management (OAuth2 / OIDC) |
| Token Validation | jsonwebtoken | 9.0 | JWT verification |
| API Docs | utoipa | 4.2 | OpenAPI spec generation |
| Runtime | Tokio | 1.45.1 | Async runtime |
| Migrations | sea-orm-migration | 1.1 | Database schema migrations |

**Key choices:**
- **Rust** was chosen for memory safety, a low resource footprint, and high
  concurrency — justifying the choice over Node.js, Python, or Go for a
  long-running API with a small ops team.
- **Axum** was chosen over Actix for ergonomics and ecosystem alignment with the
  Tokio runtime.
- **SeaORM** provides type-safe database access. Migrations run as a separate
  binary (`db-migrator`) inside a one-shot Docker container.
- **Keycloak** manages all authentication and role-based authorization. The
  backend validates JWTs via Keycloak's JWKS endpoint but never stores or
  handles passwords.

### 2.2 Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 18.3 | UI framework |
| Language | TypeScript | 5.5+ | Type-safe frontend code |
| Build | Vite | 5.4 | Build tool & dev server |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| UI Kit | Radix UI + shadcn | — | Accessible component primitives |
| State | Zustand | 5.0 | Client-side state management |
| Data Fetching | TanStack React Query | 5.81 | Server state & caching |
| Offline | IndexedDB (idb) + Service Worker | — | Offline-first PWA architecture |
| i18n | i18next + react-i18next | 25.x / 15.x | Multilingual support |
| PDF Export | jsPDF + jspdf-autotable | 3.0 / 5.0 | Report generation |
| DOCX Export | docx | 8.5 | Word document generation |
| Charts | Chart.js + react-chartjs-2 | 4.5 / 5.3 | Data visualizations |
| Drag & Drop | react-beautiful-dnd | 13.1 | Question ordering |
| Auth | keycloak-js | 26.2 | Keycloak client adapter |
| API Client | OpenAPI React Query codegen | 1.6 | Auto-generated API client |
| Validation | Zod | 4.0 | Schema validation |
| PWA | vite-plugin-pwa + Workbox | 1.0 / 7.x | Service worker & offline caching |

### 2.3 Database

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Primary DB | PostgreSQL | 17 (Alpine) | Application data |
| Keycloak DB | PostgreSQL | 17 (Alpine) | Identity & auth data |

Two separate PostgreSQL instances isolate application data from Keycloak's
identity data. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the full schema.

### 2.4 Identity & Access Management

| Component | Technology | Purpose |
|-----------|-----------|---------|
| IAM | Keycloak 26.3.1 | Authentication, authorization, user management |
| Auth Protocol | OAuth2 / OIDC | Token-based authentication flow |
| Roles | Realm roles (`application_admin`, `drgv_admin`, `org_admin`, `Org_User`) | Role-based access control |

See [RBAC_ROLES.md](RBAC_ROLES.md) for the complete RBAC model.

On startup, Keycloak imports a pre-configured realm from
`infrastructure/keycloak/realm-export.json` and runs a provisioning script
(`scripts/admin.sh`) that creates a default admin user, assigns
`application_admin` + `drgv_admin` roles, and configures SMTP for email
invitations.

### 2.5 Reverse Proxy, SSL & CDN

| Component | Technology | Purpose |
|-----------|-----------|---------|
| CDN / WAF | Cloudflare | DNS, DDoS protection, SSL, CDN caching, WAF, rate limiting |
| Web Server | Nginx (Alpine) | Reverse proxy, local SSL termination, static file serving |
| SSL | Certbot (Let's Encrypt) + Cloudflare proxy | HTTPS in production |
| SSL (dev) | Self-signed via `scripts/generate_ssl.sh` | Local HTTPS |

See [DEPLOYMENT.md](DEPLOYMENT.md) for SSL/TLS certificate generation and
renewal details.

---

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER'S BROWSER                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  React PWA (Vite + React 18)                                  │  │
│  │  - TanStack Query (data fetching)                             │  │
│  │  - IndexedDB (offline storage)                                │  │
│  │  - Service Worker (Workbox caching)                           │  │
│  │  - keycloak-js (OAuth2/OIDC auth)                            │  │
│  └───────────┬─────────────────────────────┬────────────────────┘  │
│              │ HTTPS                        │ OAuth2/OIDC          │
└──────────────┼──────────────────────────────┼──────────────────────┘
               │                              │
┌──────────────┼──────────────────────────────┼──────────────────────┐
│  Cloudflare  │                              │                      │
│              ▼                              ▼                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Cloudflare                              │  │
│  │  - DNS (sustainability.dgrvcoop360.com → 158.220.84.249)        │  │
│  │  - SSL/TLS termination & certificate mgmt                   │  │
│  │  - DDoS protection, WAF, rate limiting                      │  │
│  │  - CDN caching for static assets                             │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │ HTTPS (Full Strict)                  │
│                             ▼                                       │
│  ┌──────────────────┐            ┌───────────────────┐             │
│  │  Nginx (Frontend) │            │   Keycloak 26.3   │             │
│  │  Port 80/443      │            │   Port 8080       │             │
│  │  - Serves SPA     │            │   - Auth           │             │
│  │  - Proxies /api/  │            │   - User Mgmt      │             │
│  │  - Proxies /keycloak/ │        │   - Roles           │             │
│  └────────┬─────────┘            └────────┬──────────┘             │
│           │ /api/                          │                        │
│           ▼                                │                        │
│  ┌──────────────────┐                      │                        │
│  │  Rust Backend    │◄─────────────────────┘                        │
│  │  (Axum)          │  JWT validation                                │
│  │  Port 3001       │                                               │
│  │  - REST API      │                                               │
│  │  - Session cache  │                                               │
│  └────────┬─────────┘                                               │
│           │ SQL                                                       │
│           ▼                                                          │
│  ┌──────────────────┐            ┌───────────────────┐             │
│  │  PostgreSQL 17   │            │  PostgreSQL 17     │             │
│  │  (App DB)        │            │  (Keycloak DB)      │             │
│  │  Port 5432       │            │  Port 5432         │             │
│  └──────────────────┘            └───────────────────┘             │
│                                                                     │
│  ┌──────────────────┐                                              │
│  │  OpenAPI Fetcher  │  (one-shot: fetches spec on startup)       │
│  │  (Node 18)        │                                              │
│  └──────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow

### 4.1 Authentication Flow

1. The browser loads the React PWA and redirects to Keycloak's OIDC login page.
2. The user authenticates (email/password or organization invitation flow).
3. Keycloak issues a **JWT access token** containing the user's `sub`, realm
   roles (`realm_access.roles`), email, and `organizations` claim (name →
   `{ id, categories }`).
4. The frontend (`keycloak-js`) stores the token and attaches it as a
   `Authorization: Bearer <token>` header on every API request via the
   API interceptor (`frontend/src/services/apiInterceptor.ts`).
5. The backend `auth_middleware` validates the JWT signature against
   Keycloak's JWKS endpoint, injects `Claims` into the request extensions, and
   enforces role checks in downstream handlers.

See [RBAC_ROLES.md](RBAC_ROLES.md) for the full authorization model.

### 4.2 API Request Flow

```
Frontend → Cloudflare (TLS) → Nginx (/api) → Axum Backend → PostgreSQL → Response
```

Nginx proxies `/api` to the Rust backend (`backend:3001`) and `/keycloak/` to
the Keycloak service (`keycloak:8080`). Cloudflare terminates TLS at the edge
and re-encrypts to the origin (Full Strict mode).

### 4.3 Offline Flow

1. While online, the app pre-fetches reference data (questions, categories,
   organizations) and caches it in IndexedDB via `initialDataLoader.ts`.
2. The service worker (`sw.ts`, Workbox) precaches app shell and static
   assets.
3. While offline, the user can create assessments, answer questions, and save
   drafts. Mutations are written to IndexedDB and queued in `syncQueue`.
4. When connectivity returns, `syncService.ts` drains the queue and pushes
   pending changes to the backend.
5. See [OFFLINE_ARCHITECTURE.md](OFFLINE_ARCHITECTURE.md) for the detailed
   offline/sync design.

### 4.4 Report Generation Flow

1. A user submits an assessment → `assessments_submission` row is created.
2. The user triggers report generation → backend writes a report byte stream
   (PDF) into the `submission_reports` table.
3. The frontend fetches the report and renders charts (`Chart.js`) plus
   recommendations. Exports to PDF (`exportPDF.ts`) or DOCX (`exportDOCX.ts`)
   are generated client-side.

---

## 5. Network / Docker Topology

All services run in Docker containers on a single `tool-net` bridge network
(`docker-compose.yml`):

| Service | Container Name | Port (internal) | Port (host) |
|---------|---------------|-----------------|-------------|
| Frontend (Nginx) | `sustainability-frontend` | 80 | 127.0.0.1:8443 (dev) / 443 (prod) |
| Backend (Rust) | `sustainability-backend` | 3001 | 3002 |
| Keycloak | `sustainability-keycloak` | 8080 | 8081 |
| PostgreSQL (App) | `sustainability-db` | 5432 | 127.0.0.1:5431 |
| PostgreSQL (Keycloak) | `sustainability-keycloak-db` | 5432 | 127.0.0.1:5433 |
| Migrate (one-shot) | `sustainability-migrate` | — | — |
| OpenAPI Fetcher | `openapi-fetcher` | — | — |

**Port exposure policy:**
- Database ports (`5431`, `5433`) are bound to `127.0.0.1` only — never
  publicly exposed.
- The frontend is the single public-facing entry point (HTTPS via Cloudflare).
- Backend port `3002` and Keycloak port `8081` are exposed on the host for
  diagnostics. In production these should be restricted by the EC2 security
  group / firewall to allow only Cloudflare and admin SSH traffic. See
  [DEPLOYMENT.md](DEPLOYMENT.md) § Security hardening.

---

## 6. Service Responsibilities

### 6.1 Backend (Rust / Axum)

The backend is a **resource server**. Its responsibilities (defined in
`backend/src/web/api/routes.rs`):

- **Assessments** — create, read, update, delete, submit, save draft, get status
- **Responses** — CRUD on question responses per assessment
- **Files** — upload, download, attach to responses, remove
- **Questions** — CRUD on the question bank with revisions
- **Category catalog** — CRUD on the global category catalog; multilingual
  translations stored as JSONB
- **Organization categories** — assign/update categories per organization
- **Submissions** — list user and admin submissions, get, delete
- **Reports** — generate, list, get, delete; recommendation CRUD and status
  updates
- **Organizations** — Keycloak Organizations management (members, invitations,
  identity providers, org-admin members and assigned categories)
- **User profile** — get/update profile, change password (delegated to Keycloak)
- **Admin** — list all submissions/drafts, user invitations, delete users,
  pending invitations per org
- **Health** — `/health` and `/metrics` (unauthenticated)

### 6.2 Frontend (React / Nginx)

- **Admin pages** (`/admin/*`) — restricted to `drgv_admin`. Manage categories,
  questions, organizations, users, action plans, report history.
- **User pages** (`/dashboard`, `/assessment/*`, `/user/*`, `/action-plan/*`,
  `/submission-view/*`) — restricted to `org_admin` or `Org_User` (some also
  allow `drgv_admin`).
- **Shared** — navbar, sync status, report selection dialog, file display, etc.

### 6.3 Keycloak

- Manages users, organizations (via the preview Organizations feature
  `KC_FEATURES=preview,organization`), and realm roles.
- Issues JWTs containing `organizations` claim for multi-tenancy.
- Sends email invitations via SMTP (configured by `admin.sh`).

### 6.4 OpenAPI Fetcher (one-shot)

A Node 18 container (`scripts/fetch_openapi.js`) waits for the backend to be
healthy, fetches `/api/openapi.json`, and writes it to a shared Docker volume.
The frontend container waits for `openapi.json` before starting Nginx so the
generated API client stays in sync.

---

## 7. Volume Isolation

| Volume | Container | Data |
|--------|-----------|------|
| `postgres-data` | `sustainability-db` | All app data |
| `keycloak-postgres-data` | `sustainability-keycloak-db` | Users, roles, sessions |
| `sustainability-openapi-volume` | `openapi-fetcher` → `frontend` | OpenAPI spec JSON |

The `openapi-volume` is ephemeral and regenerated on each startup. The two
database volumes are the only persistent state and are the sole targets of the
backup strategy. See [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

---

## 8. Configuration & Environment

All runtime configuration is driven by environment variables in `.env`
(copy from `.env.example`). Key groups:

| Group | Variables | Notes |
|-------|-----------|-------|
| PostgreSQL | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Same user for app & keycloak DB |
| Backend | `RUST_LOG`, `SERVER_HOST`, `SERVER_PORT`, `CORS_ORIGIN`, `DATABASE_URL` | |
| Keycloak (backend) | `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_EXPECTED_ISSUER` | Internal `http://keycloak:8080/keycloak` |
| Frontend | `FE_HOST`, `API_BASE_URL`, `VITE_KEYCLOAK_*` | Build-time Vite vars |
| SSL | `SERVER_DN`, `SERVER_NAME` | Used by `generate_ssl.sh` + Nginx `envsubst` |
| Keycloak container | `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, `KC_HOSTNAME`, `KC_*` | |
| Email | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_FROM`, `EMAIL_USER`, `EMAIL_PASSWORD` | SMTP for invitations |

A separate `.env.prod` mirrors these with production values for the
`sustainability.dgrvcoop360.com` domain.

---

## 9. Related Documentation

- [RBAC_ROLES.md](RBAC_ROLES.md) — Roles and authorization checks
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — Database architecture and entities
- [CICD_PIPELINE.md](CICD_PIPELINE.md) — CI and deployment pipelines
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment and SSL
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) — Backup and recovery
- [IT_REVIEW_ANSWERS.md](IT_REVIEW_ANSWERS.md) — Answers to IT review questions
- [OFFLINE_ARCHITECTURE.md](OFFLINE_ARCHITECTURE.md) — Offline-first design
- [jwt-verification.md](jwt-verification.md) — JWT validation details
- [Endpoints.md](Endpoints.md) — API endpoint reference