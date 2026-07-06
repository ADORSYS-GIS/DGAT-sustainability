# CI/CD Pipeline — DGAT Sustainability Tool

## 1. Overview

There are two GitHub Actions workflows:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Every pull request | Lint, build, test, codegen for backend + frontend |
| Deploy | `.github/workflows/deploy.yml` | Push to `main` | Build + push Docker images to GHCR |

The branching model is simple:
- `main` is the production-ready branch. A push to `main` triggers the Deploy
  workflow.
- Feature/bugfix branches are used for development. Pull requests into `main`
  trigger the CI workflow.

After images are in GitHub Container Registry, **deployment to the EC2 host is
manual** — an operator SSHes in and runs `docker compose pull && docker compose
up -d`. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 2. CI Pipeline (`.github/workflows/ci.yml`)

Triggered on every pull request. Jobs run on `ubuntu-latest`.

### 2.1 Backend jobs (Rust)

| Job | Commands | Notes |
|-----|----------|-------|
| `setup` | `actions-rust-lang/setup-rust-toolchain@v1` with `rustfmt, clippy`; caches `~/.cargo` and `backend/target` keyed on `Cargo.lock` | Prerequisite for all backend jobs |
| `build` | `cargo build --workspace --all-targets --all-features` (in `backend/`) | Restores cargo cache |
| `test` | Installs `cargo-nextest` via `taiki-e/install-action`, then `cargo nextest run --workspace --all-targets --all-features --no-fail-fast` | |
| `lint` | `cargo fmt --all --check` then `cargo clippy --workspace --all-targets --all-features -- -D warnings` | Treats warnings as errors |
| `docs` | `cargo doc --workspace --all-features --no-deps` | |

All backend jobs `needs: setup` and restore the cargo cache.

### 2.2 Frontend jobs (Node / TypeScript)

| Job | Commands | Dependencies |
|-----|----------|---------------|
| `openapi_codegen` | `npm ci`, then `npm run codegen` (generates the TypeScript client from the backend OpenAPI spec and caches `frontend/src/openapi-rq` keyed on `${{ github.sha }}`) | — |
| `frontend_install` | `npm ci`, caches `node_modules` keyed on `${{ github.sha }}` | — |
| `frontend_build` | `npm run build` | `frontend_install`, `openapi_codegen` |
| `frontend_lint` | `npm run lint:check` (ESLint) | `frontend_install`, `openapi_codegen` |
| `frontend_prettier` | `npm run prettier:check` | `frontend_install`, `openapi_codegen` |
| `frontend_typescript` | `npm run ts:check` (tsc type-check) | `frontend_install`, `openapi_codegen` |
| `frontend_unit_tests` | `npm run test:unit` (Vitest), `npm run coverage`, uploads `coverage-report` artifact | `frontend_install`, `openapi_codegen` |

A SonarQube job (`frontend_sonarqube`) is present but commented out — it can be
enabled if `SONAR_TOKEN` and `SONAR_HOST_URL` secrets are configured in the
GitHub repository.

### 2.3 Codegen contract enforcement

The frontend API client in `frontend/src/openapi-rq/` is generated from the
backend's OpenAPI spec (`backend` exposes `/api/openapi.json` via `utoipa`).
Pull-request jobs regenerate the client fresh, so a change to the backend API
surfaces as generated-file diffs and downstream TypeScript / lint failures.
This guarantees the frontend–backend contract stays type-safe.

---

## 3. Deploy Pipeline (`.github/workflows/deploy.yml`)

Triggered on `push` to `main`.

| Step | Action |
|------|--------|
| 1 | `actions/checkout@v4` |
| 2 | `docker/login-action@v2` logs in to `ghcr.io` using `${{ github.actor }}` and the `DGAT_ONLINE_TOKEN` repository secret |
| 3 | `docker/build-push-action@v4` builds the **frontend** image (context `./frontend`) and pushes two tags: `ghcr.io/adorsys-gis/dgat-sustainability:latest` and `...:<sha>` |

> **Known gap:** the Deploy workflow currently only builds and pushes the
> frontend image. The backend image is **not** built or pushed by this
> workflow. The backend image is either:
> - built and pushed manually using `scripts/push_images.sh` (which runs
>   `docker compose build` then pushes both `backend` and `frontend` images),
>   or
> - built directly on the EC2 host with `docker compose build backend`
>   before `docker compose up -d`.
>
> Action item: extend `deploy.yml` to build and push the backend image as well
> so that both images are updated on every push to `main`.

### Registry

| Image | Registry path |
|-------|---------------|
| Frontend | `ghcr.io/adorsys-gis/dgat-sustainability/frontend:latest` (`:<sha>`) |
| Frontend (legacy shared tag) | `ghcr.io/adorsys-gis/dgat-sustainability:latest` (`:<sha>`) — used by deploy.yml |
| Backend | `ghcr.io/adorsys-gis/dgat-sustainability/backend:latest` — pushed via `push_images.sh` |

The `DGAT_ONLINE_TOKEN` secret must be a GitHub Personal Access Token (classic)
with `write:packages` scope to publish to GHCR.

---

## 4. Code Quality Standards

| Layer | Tool | Command |
|-------|------|---------|
| Backend formatting | `rustfmt` | `cargo fmt --all --check` |
| Backend linting | `clippy` | `cargo clippy --workspace --all-targets --all-features -- -D warnings` |
| Backend tests | `cargo-nextest` | `cargo nextest run --no-fail-fast` |
| Backend docs | `rustdoc` | `cargo doc --no-deps` |
| Frontend lint | ESLint | `npm run lint:check` |
| Frontend format | Prettier | `npm run prettier:check` |
| Frontend types | `tsc` | `npm run ts:check` |
| Frontend tests | Vitest | `npm run test:unit` + coverage |
| API contract | OpenAPI codegen | `npm run codegen` |

> **Action item:** Docker image vulnerability scanning is **not** currently in
> CI. Consider adding `trivy` or `grype` against the built images before push
> (see IT_REVIEW_ANSWERS.md).

---

## 5. Rollback procedure

There is **no automated rollback** in the deploy workflow. To roll back:

1. Identify the previous known-good image tag (a commit SHA previously deployed,
   visible in the GHCR package history).
2. On the server, edit the image tag in `.env` or the `docker-compose*.yml`
   override, or pull the explicit tag:
   ```bash
   docker compose pull frontend:<previous-sha>
   docker compose up -d
   ```
3. If schema migrations ran forward-only and are incompatible, restore the
   database from the last backup (see BACKUP_RESTORE.md).

---

## 6. Environment-specific configuration

CI/CD does not bake environment variables into the image for backend runtime
secrets. The image is generic; runtime configuration is supplied by the `.env`
file on the host (`.env.prod` on the production server). Required GitHub
secrets:

| Secret | Purpose |
|--------|---------|
| `DGAT_ONLINE_TOKEN` | PAT used to authenticate to GHCR for image push |
| (optional) `SONAR_TOKEN`, `SONAR_HOST_URL` | SonarQube analysis |
| (optional) Cloudflare API token | If adding cert automation to CI |