# Docker Deployment Guide

This guide explains how to build and deploy the Sustainability Tool to production using Docker and Docker Compose. For the original reference, see the accompanying PDF: docs/architecture/Docker Deployment Guide.pdf.

## Prerequisites

- Docker Engine and Docker Compose
- A domain name (recommended)
- SSL certificate and key (self-signed is okay for testing)
- Filled-in `.env` file (use `.env.example` as a template)

## 1) Fill your environment variables

- Copy the example to `.env` and adapt values:

```
cp .env.example .env
```

- Important values to check:
- `SERVER_DN` (public hostname you will use)
- `SERVER_NAME` (Nginx server_name rendered at runtime via envsubst; e.g. `app.example.com` or `app.example.com www.example.com`)
- `CORS_ORIGIN` (e.g. `https://your-domain`)
- `KEYCLOAK_URL` and `KEYCLOAK_FRONTEND_URL` (e.g. `https://your-domain/keycloak`)
- Database credentials and SMTP settings

## 2) Generate SSL certificates (optional for testing)

If you do not have valid certificates, you can generate self-signed ones:

```
export SERVER_DN=your-domain
bash scripts/generate_ssl.sh
```

This produces `ssl/nginx.crt` and `ssl/nginx.key`. These will be mounted into the frontend and Keycloak containers.

## 3) Build images

Build the backend and frontend images locally (or configure CI to push to a registry):

```
docker compose build backend frontend
```

Notes:
- The backend image now contains the main binary and the `db-migrator` binary.
- The frontend is built with Vite using the `VITE_...` variables from `.env`.

## 4) Start dependencies and run migrations

```
# Start Postgres and Keycloak first
docker compose up -d db keycloak

# Run one-shot migrations
docker compose up migrate
```

The `migrate` service runs `/app/db-migrator` inside the backend image and exits on completion.

## 5) Start backend and frontend

```
docker compose up -d backend openapi-fetcher frontend
```

- `backend` serves the API on port 3001 and exposes `/health`.
- `openapi-fetcher` writes the OpenAPI JSON into a shared volume that the frontend mounts and copies at startup.
- `frontend` serves the built PWA via Nginx on ports 80 and 443 and exposes `/health`.

## 6) Verify

- Frontend: https://your-domain/health should return OK.
- Backend: http(s)://your-domain/api/openapi.json should return API spec (proxied by Nginx to the backend via `/api`).
- Keycloak: https://your-domain/keycloak should load the Keycloak UI.

## 7) Production override

Use the provided override to fine-tune restart policies and healthchecks:

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Operational Notes

- Healthchecks:
- Backend: `http://localhost:3001/health`
- Frontend: `https://localhost/health` inside the container (Nginx)
- Keycloak: `http://localhost:8080/health/ready`

- CORS:
- The backend reads `CORS_ORIGIN` from environment and applies it via `tower-http`.

- SSL:
- The frontend Nginx mounts certificates from `./ssl` to `/etc/nginx/ssl`.
- Keycloak mounts the same certificate/key to `/etc/x509/https/nginx.crt` and `/etc/x509/https/nginx.key`. Ensure these paths are valid and certificates match your domain.

- Server names:
- The frontend uses envsubst to render Nginx from a template at container start.
  - Set `SERVER_NAME` in your `.env` to control the `server_name` value.
  - Examples:
    - Single host: `SERVER_NAME=app.example.com`
    - Multiple: `SERVER_NAME=app.example.com www.example.com`
    - Wildcard: `SERVER_NAME=*.example.com`
  - If `SERVER_NAME` is not set, it defaults to `_` (catch‑all).

## Upgrade & CI/CD

- Consider using the included `.github/workflows/deploy.yml` to build and push images to a registry, then `docker compose pull && docker compose up -d` on the target host.
- Ensure `frontend/package.json` `postinstall`/`codegen` runs in CI if you depend on OpenAPI codegen at build time.

## Troubleshooting

- If the frontend serves but the API calls fail, verify:
- `API_BASE_URL` used at build time points to your public base URL (e.g. `https://your-domain`).
- Nginx proxy blocks (`/api` and `/keycloak/`) are correct.

- If Keycloak redirects look wrong, verify `KEYCLOAK_FRONTEND_URL` and hostname settings in `.env`, and container environment (KC_* variables).

- If migrations fail, check `DATABASE_URL` and Postgres `healthcheck`.

## Reference

- PDF reference: docs/architecture/Docker Deployment Guide.pdf
