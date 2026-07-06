# DGAT Sustainability Tool

The DGAT Sustainability Tool is a digital platform that helps cooperatives in
Southern Africa evaluate their sustainability performance across environmental,
financial, and governance dimensions. It is delivered as an offline-capable
**Progressive Web App (PWA)** backed by a **Rust** REST API and hosted on a
single Docker-Compose stack fronted by **Cloudflare**. This project is part of
a broader DGRV initiative to support cooperative development through digital
transformation.

> **Documentation:** Full handover documentation lives in [`docs/`](docs/).
> Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Features

- **Offline-first PWA** — conduct assessments without an internet connection;
  data syncs automatically when back online via IndexedDB + a Workbox service
  worker.
- **Multilingual support** — interface and content in 7 locales (en, fr, pt,
  de, ar, ss, zu) via i18next.
- **Role-based access control** — secure access for `application_admin`,
  `dgrv_admin`, `org_admin`, and `Org_User` roles via Keycloak (OAuth2/OIDC).
  See [docs/RBAC_ROLES.md](docs/RBAC_ROLES.md).
- **Assessment management** — create, save (draft), and submit sustainability
  assessments with dynamic, versioned question sets.
- **Reporting** — generate reports with scores, Chart.js visualizations, and
  recommendations; export to PDF (jsPDF) or DOCX.
- **Secure architecture** — JWT validation, TLS end-to-end (Cloudflare Full
  Strict + Let's Encrypt), CORS-restricted API.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust 1.88 + Axum 0.7 + SeaORM 1.1 + Tokio, OpenAPI via utoipa |
| Frontend | React 18 + TypeScript + Vite + Tailwind + TanStack Query + Zustand |
| Database | PostgreSQL 17 (app DB + isolated Keycloak DB) |
| Identity | Keycloak 26.3.1 (OAuth2/OIDC, Organizations preview feature) |
| Proxy / CDN | Nginx + Cloudflare (DNS, WAF, CDN, TLS, rate limiting) |
| Ops | Docker Compose on a single EC2 host; GitHub Actions CI/CD |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full stack and system
diagram.

---

## Project Structure

```
DGAT-sustainability/
├── backend/                # Rust backend (Axum) — API server + db-migrator
│   ├── src/
│   │   ├── common/         # config, database (entities, migrations), services, models
│   │   └── web/            # routes, handlers, middleware (auth, JWT, logging)
│   └── tests/
├── frontend/               # React PWA (Vite) served by Nginx
│   ├── src/
│   │   ├── pages/          # admin + user pages
│   │   ├── components/     # shared + UI primitives (shadcn/Radix)
│   │   ├── hooks/          # offline + data hooks
│   │   ├── services/       # apiInterceptor, indexedDB, syncService, authService
│   │   ├── openapi-rq/     # generated TypeScript API client
│   │   └── i18n/           # locale resources
│   ├── nginx.conf.template # envsubst Nginx config (reverse proxy)
│   └── package.json
├── infrastructure/
│   ├── Dockerfile.backend  # multi-stage Rust build
│   ├── Dockerfile.frontend # multi-stage Node→Nginx build
│   └── keycloak/           # realm-export.json
├── scripts/                # backup.sh, restore.sh, generate_ssl.sh, push_images.sh, admin.sh, ...
├── docs/                   # handover documentation (see docs/README.md)
├── .github/workflows/      # ci.yml, deploy.yml
├── docker-compose.yml      # local dev stack
├── docker-compose.prod.yml # production overlay
├── .env.example            # environment template
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend dev tooling) — optional for container-only workflow
- Rust 1.88+ (for backend dev) — optional for container-only workflow
- PostgreSQL client tools (for backup/restore / manual DB access)

### Steps

```bash
# 1. Clone
git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git
cd DGAT-sustainability

# 2. Configure environment
cp .env.example .env
# Edit .env: set SERVER_DN, KEYCLOAK_ADMIN_PASSWORD, POSTGRES_PASSWORD, EMAIL_* etc.

# 3. Generate self-signed certs for local HTTPS
SERVER_DN=localhost ./scripts/generate_ssl.sh

# 4. Start all services (DB, Keycloak, backend, frontend, migrations)
docker compose up -d

# 5. Access the app
#    Frontend:        https://localhost:8443
#    Keycloak admin:  https://localhost:8081/keycloak  (admin / admin123 by default)
#    Backend health:  http://localhost:3002/api/health
```

The `migrate` one-shot container applies SeaORM migrations automatically before
the backend starts, and the `openapi-fetcher` container copies the backend's
OpenAPI spec into a shared volume for the frontend.

For full local development details, branch protection, and per-service commands,
see the relevant sections in `docs/`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §6 for each service's
responsibilities.

---

## Deployment

Production runs on a single AWS EC2 instance fronted by Cloudflare. Images are
built and pushed to GHCR by GitHub Actions on push to `main`; an operator SSHes
to the server and runs:

```bash
cd <project-dir>
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

SSL certificates are issued by **Certbot / Let's Encrypt** on the origin and
distributed through **Cloudflare Full (Strict)** mode.

For the full deployment procedure, SSL setup, Certbot renewal automation, and
the security hardening checklist, see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Backup & Recovery

Daily backups are produced by `scripts/backup.sh` (cron) and include the app
DB, Keycloak DB, `.env`, and a Keycloak realm JSON export. Restore with
`scripts/restore.sh`. Optional off-site upload via `rclone`.

See [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) for the full strategy,
scheduling, and recovery scenarios.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, components, data flow, topology |
| [docs/RBAC_ROLES.md](docs/RBAC_ROLES.md) | Roles and RBAC implementation (backend + frontend) |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Database architecture, entities, JSONB usage, migrations |
| [docs/CICD_PIPELINE.md](docs/CICD_PIPELINE.md) | CI jobs and image deploy workflow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment, SSL/Certbot, hardening |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Backup scripts, scheduling, recovery |
| [docs/IT_REVIEW_ANSWERS.md](docs/IT_REVIEW_ANSWERS.md) | Answers to IT review open questions |
| [docs/OFFLINE_ARCHITECTURE.md](docs/OFFLINE_ARCHITECTURE.md) | PWA offline & sync design |
| [docs/Endpoints.md](docs/Endpoints.md) | API endpoint reference |

See [docs/README.md](docs/README.md) for the complete documentation index.

---

## Contributing

1. Fork the repository.
2. Create a feature/bugfix branch off `main`.
3. Open a pull request — CI runs lint, build, tests, codegen, and type checks
   on every PR (see [docs/CICD_PIPELINE.md](docs/CICD_PIPELINE.md)).
4. Ensure `cargo fmt`, `cargo clippy`, ESLint, Prettier, and `tsc` all pass
   locally before pushing.

---

## Security

- **Authentication** via Keycloak OAuth2/OIDC; the backend validates JWTs
  against Keycloak's JWKS endpoint.
- **TLS** end-to-end: Cloudflare edge TLS + Let's Encrypt on the Nginx origin
  (Full Strict).
- **Access control**: role-based permissions enforced server-side on every API
  request (see [docs/RBAC_ROLES.md](docs/RBAC_ROLES.md)).
- **Default credentials** in `.env.example` must be changed for production.

## License

This project is licensed under the terms in the [LICENSE](LICENSE) file.