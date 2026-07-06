# IT Review Meeting — DGAT Sustainability Tool

**Date:** _______________
**Attendees:** _______________
**Facilitator:** _______________

---

## 1. Technology Stack

### 1.1 Backend

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

**Talking Points:**
- Why Rust? Memory safety, low resource footprint, high concurrency — justify the choice vs. more common alternatives (Node.js, Python, Go).
- Axum was chosen over Actix for ergonomics and ecosystem alignment with Tokio.
- SeaORM provides type-safe database access; migrations are run as a separate binary (`db-migrator`).
- Keycloak handles all authentication and role-based authorization; the backend validates JWTs but does not manage passwords.

### 1.2 Frontend

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

**Talking Points:**
- The frontend is a Progressive Web App (PWA) — works offline via IndexedDB and service worker.
- OpenAPI client is auto-generated from the backend's OpenAPI spec, ensuring type safety.
- i18next supports multilingual content (needed for Southern African cooperatives).
- Chart.js and jsPDF handle sustainability report visualizations and exports.

### 1.3 Database

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Primary DB | PostgreSQL | 17 (Alpine) | Application data |
| Keycloak DB | PostgreSQL | 17 (Alpine) | Identity & auth data |

**Database Schema (Key Entities):**
- `assessments` — Assessment headers with status (Draft/Submitted/Completed)
- `assessments_response` — Individual responses linked to assessments
- `assessments_submission` / `temp_submission` — Finalized and draft submissions
- `submission_reports` — Generated reports per submission
- `questions` / `questions_revisions` — Question bank with versioning
- `category_catalog` / `organization_categories` — Category hierarchy per org
- `user_category_assignments` — Maps users to categories they can assess
- `file` / `assessments_response_file` — Uploaded file attachments
- `organization_categories` — Organization-specific category assignments

**Talking Points:**
- JSONB columns store multilingual text and flexible answer data.
- Two separate PostgreSQL instances isolate app data from Keycloak data.
- Migrations are managed by SeaORM and applied via the `db-migrator` binary.

### 1.4 Identity & Access Management

| Component | Technology | Purpose |
|-----------|-----------|---------|
| IAM | Keycloak 26.3.1 | Authentication, authorization, user management |
| Auth Protocol | OAuth2 / OIDC | Token-based authentication flow |
| Roles | Realm roles (`application_admin`, `drgv_admin`, `org_admin`) | Role-based access control |

**Talking Points:**
- Keycloak manages users, organizations (via Groups/Organizations feature), and roles.
- JWT tokens carry `user_id` and `organizations` attributes for multi-tenancy.
- The backend validates JWT tokens via Keycloak's JWKS endpoint.
- On startup, Keycloak imports a pre-configured realm from `infrastructure/keycloak/realm-export.json` and runs a provisioning script (`scripts/admin.sh`) that creates a default admin user and configures SMTP.

### 1.5 Reverse Proxy, SSL & CDN

| Component | Technology | Purpose |
|-----------|-----------|---------|
| CDN / WAF | Cloudflare | DNS management, DDoS protection, SSL, CDN caching, WAF |
| Web Server | Nginx (Alpine) | Reverse proxy, local SSL termination, static file serving |
| SSL | Certbot (Let's Encrypt) + Cloudflare proxy | HTTPS |
| SSL (dev) | Self-signed via `scripts/generate_ssl.sh` | Local HTTPS |

**SSL/TLS Certificate Generation:**

The production environment uses **Certbot** with **Let's Encrypt** to generate trusted SSL certificates, distributed through **Cloudflare**'s DNS proxy. This replaces the self-signed certificates used for local development.

**How certificates are generated:**

1. **Local Development** — `scripts/generate_ssl.sh` creates self-signed certificates (`ssl/nginx.crt`, `ssl/nginx.key`) using `openssl req -x509`. These are sufficient for local testing but cause browser warnings.
2. **Production** — **Certbot** is used on the EC2 server to obtain Let's Encrypt certificates for the domain (`sustainability.dgrvcoop360.com`). The certificate workflow is:
   - Cloudflare manages DNS for `sustainability.dgrvcoop360.com`, pointing to `158.220.84.249`
   - Certbot runs on the server and performs the ACME challenge (HTTP-01 or DNS-01 via Cloudflare plugin) to prove domain ownership
   - Certbot obtains a Let's Encrypt certificate and stores it in `/etc/letsencrypt/` (or the certs are copied/mounted to `ssl/nginx.crt` and `ssl/nginx.key`)
   - Certbot's renewal cron/timer handles automatic renewal before expiration (Let's Encrypt certs are valid for 90 days)
   - The Nginx container mounts the certificates from `./ssl/` as `/etc/nginx/ssl/nginx.crt` and `/etc/nginx/ssl/nginx.key` (as configured in `docker-compose.prod.yml`)
3. **Cloudflare SSL Mode** — Cloudflare is set to **Full (Strict)** mode, meaning Cloudflare validates the origin certificate. This requires a valid (Let's Encrypt) certificate on the Nginx server. Traffic flow:
   - `User → Cloudflare (TLS) → Cloudflare validates origin cert → EC2/Nginx (TLS) → Backend`

**Why Cloudflare?**
- **SSL/TLS Certificate Management** — Cloudflare proxies DNS and provides edge-level TLS, while Certbot handles the origin certificate. Together they ensure end-to-end encryption with trusted certificates.
- **DDoS Protection & WAF** — Cloudflare sits in front of the EC2 instance, filtering malicious traffic before it reaches Nginx or Keycloak. This is critical since Keycloak (port 8081) and the backend API (port 3002) are otherwise exposed on the host network.
- **CDN & Caching** — Cloudflare caches static assets (JS, CSS, images, fonts) at edge locations worldwide, reducing latency for users in Southern Africa and beyond. The Nginx + Workbox service worker caching complements this at the browser level.
- **DNS Management** — The `sustainability.dgrvcoop360.com` domain is managed through Cloudflare, with DNS records proxying to the EC2 IP. Cloudflare handles DNS propagation and record management.
- **SSL Termination (Cloudflare → Origin)** — Cloudflare terminates HTTPS on the edge and proxies to the origin server via HTTPS (Full Strict mode). The Nginx container must present the valid Let's Encrypt certificate.
- **Rate Limiting** — Cloudflare provides configurable rate limiting to protect the Keycloak auth endpoints and backend API from abuse.

**Talking Points:**
- Nginx serves the built React SPA, proxies `/api/` to the Rust backend, and `/keycloak/` to Keycloak.
- Nginx config is templated via `envsubst` for dynamic `server_name` (`SERVER_NAME` env var).
- Keycloak also uses the same certificates (`/etc/x509/https/nginx.crt`, `nginx.key`) for HTTPS — the `admin.sh` script imports them into the Java truststore.
- Certbot renewal should be automated via cron (`certbot renew --deploy-hook "docker compose restart frontend"`).
- In the dev `docker-compose.yml`, Nginx listens on port 80 only (HTTP) without SSL. In production (`docker-compose.prod.yml`), it listens on 443 with SSL.

---

## 2. Overview Schema / Architecture

### 2.1 System Architecture Diagram

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
│  Docker Host │                              │                      │
│              ▼                              ▼                      │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                      Cloudflare                              │     │
│  │  - DNS (sustainability.dgrvcoop360.com → 158.220.84.249)       │     │
│  │  - SSL/TLS termination & certificate mgmt                   │     │
│  │  - DDoS protection, WAF, rate limiting                      │     │
│  │  - CDN caching for static assets                             │     │
│  └──────────────────────────┬───────────────────────────────────┘     │
│                             │ HTTPS                                  │
│                             ▼                                        │
│  ┌──────────────────┐            ┌───────────────────┐               │
│  │  Nginx (Frontend) │            │   Keycloak 26.3   │               │
│  │  Port 80/443      │            │   Port 8080       │               │
│  │  - Serves SPA     │            │   - Auth           │               │
│  │  - Proxies /api/  │            │   - User Mgmt      │               │
│  │  - Proxies /kc/   │            │   - Roles           │               │
│  └────────┬─────────┘            └────────┬──────────┘               │
│           │ /api/                          │                        │
│           ▼                                │                        │
│  ┌──────────────────┐                      │                        │
│  │  Rust Backend    │◄─────────────────────┘                        │
│  │  (Axum)          │  JWT validation                                │
│  │  Port 3001       │                                               │
│  │  - REST API      │                                               │
│  │  - Request/Session cache                                          │
│  └────────┬─────────┘                                               │
│           │ SQL                                                       │
│           ▼                                                          │
│  ┌──────────────────┐            ┌───────────────────┐             │
│  │  PostgreSQL 17   │            │  PostgreSQL 17     │             │
│  │  (App DB)        │            │  (Keycloak DB)      │             │
│  │  Port 5431       │            │  Port 5433         │             │
│  └──────────────────┘            └───────────────────┘             │
│                                                                     │
│  ┌──────────────────┐                                              │
│  │  OpenAPI Fetcher  │  (one-shot: fetches spec on startup)       │
│  │  (Node 18)        │                                              │
│  └──────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Authentication Flow:** User → Frontend → Keycloak (OAuth2/OIDC) → JWT token → Frontend stores token → sends in API requests.
2. **API Request Flow:** Frontend → Nginx (`/api/`) → Axum Backend → PostgreSQL → Response.
3. **Offline Flow:** Frontend stores data in IndexedDB → Queues in `syncQueue` → Background sync when online via Service Worker.
4. **Report Generation:** Backend generates PDF/CSV reports from assessment data → stored in `submission_reports` table → Downloaded by frontend.

### 2.3 Network / Docker Topology

All services run in Docker containers on a single `tool-net` bridge network:

| Service | Container Name | Port (internal) | Port (host) |
|---------|---------------|-----------------|-------------|
| Frontend (Nginx) | sustainability-frontend | 80 | 8443 |
| Backend (Rust) | sustainability-backend | 3001 | 3002 |
| Keycloak | sustainability-keycloak | 8080 | 8081 |
| PostgreSQL (App) | sustainability-db | 5432 | 5431 |
| PostgreSQL (Keycloak) | sustainability-keycloak-db | 5432 | 5433 |
| Migrate (one-shot) | sustainability-migrate | — | — |
| OpenAPI Fetcher | openapi-fetcher | — | — |

**Talking Points:**
- Database ports (5431, 5433) are bound to `127.0.0.1` only, not publicly exposed.
- Frontend is the single public-facing entry point (port 8443 HTTPS).
- Backend port 3002 is exposed for development/diagnostic access.
- Keycloak port 8081 is exposed for direct admin access (should be restricted in production).

---

## 3. Development Process

### 3.1 Local Development Setup

**Prerequisites:**
- Docker & Docker Compose
- Node.js 20+ (for frontend dev)
- Rust 1.88+ (for backend dev)
- PostgreSQL client tools (for backup/restore)

**Steps:**
1. Clone repo: `git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git`
2. Configure environment: `cp .env.example .env` and edit values
3. Start all services: `docker compose up -d`
4. Run migrations: Automatic (`migrate` container runs on startup)
5. Access frontend: `https://localhost:8443`
6. Access Keycloak admin: `https://localhost:8081/keycloak`

**Talking Points:**
- The `docker-compose.yml` orchestrates all services for local dev.
- The `migrate` container is a one-shot job using the same backend image.
- The `openapi-fetcher` container waits for the backend to be healthy, then fetches the OpenAPI spec and writes it to a shared volume for the frontend to consume.
- Keycloak imports the realm configuration from `infrastructure/keycloak/realm-export.json` on first startup.
- The `admin.sh` script provisions a default admin user and configures SMTP on every Keycloak startup.

### 3.2 Branching & CI/CD

**Branching Model:**
- `main` — production-ready branch; pushes trigger deployment workflow
- Feature branches — used for development, PRs merged to `main`

**CI Pipeline (`.github/workflows/ci.yml`):**
Triggered on every pull request. Jobs include:

| Stage | Scope | What It Does |
|-------|-------|-------------|
| Setup | Backend | Install Rust, cache dependencies |
| Build | Backend | `cargo build --workspace --all-targets --all-features` |
| Test | Backend | `cargo nextest run` |
| Lint | Backend | `cargo fmt --check` + `cargo clippy` |
| Docs | Backend | `cargo doc` |
| OpenAPI Codegen | Frontend | Generate TypeScript client from OpenAPI spec |
| Install | Frontend | `npm ci` |
| Build | Frontend | `vite build` |
| Lint | Frontend | ESLint |
| Prettier | Frontend | Format check |
| TypeScript | Frontend | Type checking |
| Unit Tests | Frontend | Vitest + coverage |

**Deployment Pipeline (`.github/workflows/deploy.yml`):**
- Triggered on push to `main`
- Builds Docker image(s)
- Pushes to GitHub Container Registry (`ghcr.io/adorsys-gis/dgat-sustainability`)
- Tags with `latest` and commit SHA
- Manual `docker compose pull && docker compose up -d` on target server

**Talking Points:**
- CI runs comprehensive checks on both backend and frontend.
- Frontend depends on OpenAPI codegen job; changes to the API spec propagate automatically.
- Deployment is currently manual after image push (no automated roll-out).
- Consider: should we add automated deployment to the EC2 server?

### 3.3 Code Quality

- **Backend:** `cargo fmt` (formatting), `cargo clippy` (linting), `cargo nextest` (testing)
- **Frontend:** ESLint, Prettier, TypeScript strict mode, Vitest unit tests
- **API Contract:** OpenAPI spec generated by utoipa, consumed by frontend via codegen

---

## 4. Deployment

### 4.1 Current Deployment Model

**Environment:** Single EC2 instance (IP: `158.220.84.249` as per `.env.prod`)
**Method:** Docker Compose with manual image pulls

**Deployment Steps:**
1. GitHub Actions builds images on push to `main`
2. Images pushed to `ghcr.io/adorsys-gis/dgat-sustainability`
3. On the server: `docker compose pull && docker compose up -d`
4. Or: `bash scripts/push_images.sh` to build and push manually

**Production Override:** `docker-compose.prod.yml` applies production settings (restart policies, `unless-stopped`).

### 4.2 Docker Images

| Image | Base | Registry |
|-------|------|----------|
| Backend | `rust:1.88.0-slim-bookworm` → `debian:bookworm-slim` | `ghcr.io/adorsys-gis/dgat-sustainability/backend:latest` |
| Frontend | `node:20-slim` → `nginx:alpine` | `ghcr.io/adorsys-gis/dgat-sustainability/frontend:latest` |
| Keycloak | `quay.io/keycloak/keycloak:26.3.1` | Official image |
| PostgreSQL | `postgres:17-alpine` | Official image |

**Multi-stage builds:** Both backend and frontend use multi-stage Dockerfiles to minimize final image size.

### 4.3 SSL/TLS

**Local Development:**
- Self-signed certificates generated via `scripts/generate_ssl.sh` (using `openssl req -x509`)
- Stored in `ssl/nginx.crt` and `ssl/nginx.key`
- Mounted into frontend container at `/etc/nginx/ssl/` and Keycloak at `/etc/x509/https/`
- Keycloak's `admin.sh` script imports the cert into the Java truststore

**Production:**
- **Certbot** generates Let's Encrypt certificates on the EC2 server for `sustainability.dgrvcoop360.com`
- Certbot performs ACME challenge (likely DNS-01 via Cloudflare plugin or HTTP-01)
- Certificates are stored/linked in `ssl/nginx.crt` and `ssl/nginx.key` and mounted into containers
- Automatic renewal via Certbot's renewal timer (90-day cert lifetime)
- Renewal deploy hook should restart Nginx: `certbot renew --deploy-hook "docker compose restart frontend"`
- **Cloudflare SSL Mode: Full (Strict)** — Cloudflare validates the origin Let's Encrypt certificate
- Nginx template uses `envsubst` for dynamic `server_name` via `SERVER_NAME` env var

### 4.4 Health Checks

| Service | Check | Interval |
|---------|-------|----------|
| Backend | `curl http://localhost:3001/health` | 30s |
| Frontend | `curl -f http://localhost/health` (or `https://localhost/health`) | 30s |
| Keycloak | `exit 0` (placeholder) / HTTP 200 readiness | 30s |
| PostgreSQL (App) | `pg_isready` | 10s |
| PostgreSQL (Keycloak) | `pg_isready` | 10s |

### 4.5 Open Questions for the Meeting

- [ ] What is the current VM/EC2 spec (CPU, RAM, disk)?
- [ ] Is there a staging environment, or is there only production?
- [ ] Are there any CDN or load balancer in front of the server? (Cloudflare is in use)
- [ ] What is the DNS configuration? Is `sustainability.dgrvcoop360.com` the production domain managed via Cloudflare?
- [ ] What Cloudflare plan is in use? (Free, Pro, Business, Enterprise)
- [ ] What is the Cloudflare SSL mode? (Flexible, Full, Full Strict)
- [ ] Are Cloudflare firewall rules configured? What zones are protected?
- [ ] Who has access to the production server?
- [ ] Are Docker images scanned for vulnerabilities before deployment?
- [ ] Is there a rollback procedure if a deployment fails?

---

## 5. Recovery & Backup

### 5.1 Backup Strategy

**Script:** `scripts/backup.sh`
**What Gets Backed Up:**

| # | Artifact | Source | Format |
|---|----------|--------|--------|
| 1 | App database | PostgreSQL port 5431 | `pg_dump -F c` (custom) |
| 2 | Keycloak database | PostgreSQL port 5433 | `pg_dump -F c` (custom) |
| 3 | `.env` file | Repo root | Copy |
| 4 | Keycloak realm export | Keycloak Admin REST API | JSON |

**Retention Policy:**

| Scope | Default | Override Variable |
|-------|---------|-------------------|
| Local | 7 days | `BACKUP_RETAIN_DAYS` |
| Remote (S3) | 30 days | `BACKUP_REMOTE_RETAIN_DAYS` |

**Scheduling:** Designed for cron (e.g., `0 2 * * *` for daily 2 AM runs)

**Off-site Upload:** Optional via `rclone` to any S3-compatible storage (AWS S3, Backblaze B2, MinIO).

### 5.2 Restore Strategy

**Script:** `scripts/restore.sh`

**Restore Modes:**
- `all` — Restore app DB + Keycloak DB + `.env`
- `app` — Restore only the app database
- `keycloak` — Restore only the Keycloak database
- `env` — Restore only the `.env` file

**Restore Procedure:**
1. Extract archive: `tar -xzf <backup>.tar.gz`
2. Terminate DB connections, drop and recreate database
3. Run `pg_restore` with `--no-owner --role=postgres`
4. Restart services: `docker compose restart`

**Recovery Scenarios (documented in `docs/BACKUP_RESTORE.md`):**
1. **Accidental data deletion** → `restore.sh <backup> app` + restart backend
2. **Full instance failure (new server)** → Install Docker, clone repo, `restore.sh <backup> all`, `docker compose up -d`
3. **Keycloak users lost** → `restore.sh <backup> keycloak` + restart Keycloak
4. **Wrong .env / config mismatch** → `restore.sh <backup> env` + restart all

### 5.3 Volume Isolation

| Volume | Container | Data |
|--------|-----------|------|
| `postgres-data` | `sustainability-db` | All app data |
| `keycloak-postgres-data` | `sustainability-keycloak-db` | Users, roles, sessions |
| `sustainability-openapi-volume` | `openapi-fetcher` → `frontend` | OpenAPI spec JSON |

**Talking Points:**
- Database volumes can be independently wiped and restored.
- The `openapi-volume` is ephemeral and regenerated on each startup.
- Backups cover both databases and the environment configuration.
- Keycloak realm export via REST API (since `kc.sh export` cannot run while Keycloak is running).
- Cloudflare sits in front of the EC2 instance for DNS, CDN, SSL, DDoS protection, and WAF
- **Risk:** No automated backup verification. Should we add a verification step?

### 5.4 Open Questions for the Meeting

- [ ] Is the cron job for automated backups actually set up on the production server?
- [ ] Is `rclone` configured for off-site backup uploads?
- [ ] What is the RPO (Recovery Point Objective)? Is 24 hours acceptable?
- [ ] What is the RTO (Recovery Time Objective)? How quickly must the system be restored?
- [ ] Are backups tested periodically (restore drill)?
- [ ] Is there a disaster recovery plan for total server loss?
- [ ] Where are the production `.env` secrets stored securely?

---

## 6. Server Access

### 6.1 Server Infrastructure

**Current Setup:**
- Single EC2 instance (IP: `158.220.84.249` based on `.env.prod`)
- All services run via Docker Compose on this single host
- Cloudflare sits in front — handles DNS (`sustainability.dgrvcoop360.com` → EC2 IP), SSL/TLS, CDN caching, DDoS protection, and WAF

### 6.2 Access Model

| Access Method | Target | Port | Notes |
|---------------|--------|------|-------|
| HTTPS | Cloudflare → Nginx | 8443 (origin) | Primary user access via Cloudflare proxy |
| HTTP (dev) | Frontend (Nginx) | 80 | Prod override uses HTTPS |
| Backend API | Backend | 3002 | Exposed for debugging (should be restricted) |
| Keycloak Admin | Keycloak | 8081 | Admin console access (should be firewalled) |
| PostgreSQL (App) | App DB | 5431 | Bound to `127.0.0.1` only |
| PostgreSQL (Keycloak) | Keycloak DB | 5433 | Bound to `127.0.0.1` only |

### 6.3 Authentication & Authorization

| Layer | Mechanism | Details |
|-------|-----------|---------|
| Application Auth | Keycloak OAuth2/OIDC | JWT tokens with user_id and organizations |
| User Roles | Keycloak realm roles | `application_admin`, `drgv_admin`, `org_admin` |
| API Auth | JWT Bearer tokens | Backend validates tokens via Keycloak JWKS |
| DB Access | PostgreSQL credentials | `POSTGRES_USER` / `POSTGRES_PASSWORD` from `.env` |
| Keycloak Admin | Keycloak master realm | `admin` / `admin123` (default, must change in production!) |

### 6.4 Security Considerations

- **Default credentials:** `.env.example` contains default passwords (`postgres`, `admin123`) — these MUST be changed for production
- **Exposed ports:** Backend (3002) and Keycloak (8081) are exposed on the host network — Cloudflare WAF helps, but firewall rules should still restrict direct access
- **Database ports:** Bound to `127.0.0.1` only — not publicly accessible
- **SSL:** Certbot with Let's Encrypt provides production TLS certificates (auto-renewed); Cloudflare is set to Full (Strict) mode validating the origin cert; `scripts/generate_ssl.sh` creates self-signed certs for local dev only
- **CORS:** Backend allows specified `CORS_ORIGIN` only
- **Secrets in `.env`:** Contains SMTP credentials and passwords — should be managed securely (e.g., Docker secrets, vault)

### 6.5 Diagnostic Tools

- **Performance diagnostics:** `scripts/diagnose-performance.sh` — checks system resources, Docker stats, DB connections, service health
- **Health endpoints:** `/health` on frontend and `/api/health` on backend
- **Container logs:** `docker compose logs <service>`

### 6.6 Open Questions for the Meeting

- [ ] Who has SSH access to the production server? Is it documented?
- [ ] Is there a firewall (security group) restricting access to ports 3002 and 8081?
- [ ] Are there any rate limiting or DDoS protection measures in place?
- [ ] Is HTTPS terminated at Cloudflare, or does Nginx also enforce HTTPS?
- [ ] Are Cloudflare firewall rules in place?
- [ ] Is Certbot auto-renewal configured and tested? Does the deploy hook restart Nginx?
- [ ] Are Cloudflare firewall rules in place?
- [ ] Are SSL certificates properly managed and renewed? (Certbot + Cloudflare)
- [ ] Has a security audit been conducted?
- [ ] How are application secrets managed?
- [ ] What Cloudflare SSL mode is configured? (Should be Full Strict)

---

## 7. Summary of Action Items

| # | Category | Action Item | Priority | Owner |
|---|----------|------------|----------|-------|
| 1 | Security | Change default passwords in production `.env` | Critical | |
| 2 | Security | Restrict access to ports 3002 and 8081 (firewall) | Critical | |
| 3 | Security | Ensure Certbot auto-renewal is configured and tested | High | Verify `certbot renew` cron/timer + deploy hook |
| 4 | Security | Move secrets to a secrets manager (Docker secrets, Vault, etc.) | High | |
| 5 | Backup | Verify backup cron is configured on production server | High | |
| 6 | Backup | Configure `rclone` for off-site backup uploads | Medium | |
| 7 | Backup | Schedule periodic backup restore tests | Medium | |
| 8 | Deployment | Automate deployment (currently manual `docker compose pull`) | Medium | |
| 9 | Deployment | Add Docker image vulnerability scanning to CI | Medium | |
| 10 | Monitoring | Set up application monitoring & alerting (CloudWatch, Prometheus, etc.) | Medium | |
| 11 | Infrastructure | Document production VM specs and scaling plan | Medium | |
| 12 | Infrastructure | Consider adding resource limits to Docker Compose services | Low | |
| 13 | Infrastructure | Document DNS configuration and domain names | Low | |
| 14 | Compliance | Verify GDPR compliance for data handling | High | |
| 15 | Compliance | Establish incident response procedure | High | |

---

## 8. Questions Template (Fill During Meeting)

### Technology Stack
- [ ] Are there any planned technology changes or upgrades?
- [ ] Is the current Rust version (1.88) aligned with the team's expertise?
- [ ] What is the plan for dependency updates and security patches?
- [ ] Is the Keycloak Organizations feature (preview) production-ready?

### Architecture
- [ ] Is the single-server deployment sufficient for the expected load?
- [ ] What is the peak expected concurrent user count?
- [ ] Is there a plan for horizontal scaling if needed?
- [ ] How will the offline/sync conflict resolution strategy be tested?

### Development
- [ ] What is the current development team size and velocity?
- [ ] Is the CI pipeline sufficient? Are there any gaps?
- [ ] What is the code review process?
- [ ] How are environment-specific configurations managed?

### Deployment
- [ ] Is there a staging environment for testing before production?
- [ ] What is the rollback procedure?
- [ ] Are Docker images scanned for vulnerabilities?
- [ ] How are database schema migrations handled in production?

### Backup & Recovery
- [ ] What is the backup schedule? Is it running?
- [ ] Where are backups stored? Is off-site configured?
- [ ] Has a restore drill been performed?
- [ ] What are the RPO and RTO targets?

### Server Access
- [ ] Who has production server access?
- [ ] Is access audited and logged?
- [ ] Are there separate accounts for different team members?
- [ ] Is 2FA/MFA enforced for server access?

### Security
- [ ] Have default credentials been changed in production?
- [ ] Is there a WAF or rate limiting in place?
- [ ] Are SSL certificates properly managed and renewed?
- [ ] Has a security audit been conducted?
- [ ] How are application secrets managed?