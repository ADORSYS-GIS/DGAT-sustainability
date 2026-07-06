# Deployment Guide — DGAT Sustainability Tool

## 1. Current Deployment Model

| Property | Value |
|----------|-------|
| Platform | Single AWS EC2 instance (IP `158.220.84.249`) |
| Orchestration | Docker Compose (single host, `tool-net` bridge network) |
| Domain | `sustainability.dgrvcoop360.com` (managed via Cloudflare) |
| TLS termination | Cloudflare edge (Full Strict) + Nginx origin (Let's Encrypt via Certbot) |
| Image registry | GitHub Container Registry (`ghcr.io/adorsys-gis/dgat-sustainability`) |
| Delivery | Semi-automatic: GitHub Actions builds & pushes images on push to `main`; an operator SSHes to the server and pulls |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system diagram and topology.

### Compose files

- `docker-compose.yml` — dev/local stack. Frontend on HTTP port 80 (host
  `127.0.0.1:8443`), self-signed certs, Keycloak import via `admin.sh`.
- `docker-compose.prod.yml` — production overlay. Adds `restart: unless-stopped`
  policies, mounts `./ssl` certificates into the frontend, runs the Nginx
  `envsubst` template, and uses a proper Keycloak readiness healthcheck.

To start the production stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production override uses `${...}` variables from `.env.prod`. Copy
`.env.example` to `.env` and override with production values, or maintain a
`.env.prod` and source it before running compose.

---

## 2. SSL / TLS Certificate Workflow

### 2.1 Local development (self-signed)

`scripts/generate_ssl.sh` creates self-signed certificates using
`openssl req -x509`:

```bash
SERVER_DN=localhost ./scripts/generate_ssl.sh
```

Outputs:
- `ssl/nginx.crt`
- `ssl/nginx.key`

These are mounted into the frontend (`/etc/nginx/ssl/`) and Keycloak
(`/etc/x509/https/`). They are sufficient for local testing but cause browser
warnings. The `admin.sh` script imports the cert into Keycloak's Java
truststore so Keycloak can talk to itself over HTTPS.

### 2.2 Production (Let's Encrypt via Certbot + Cloudflare Full Strict)

Production uses **Certbot** with **Let's Encrypt** to obtain a trusted
certificate for `sustainability.dgrvcoop360.com`, distributed through Cloudflare's
DNS proxy.

Certificate generation steps (run on the EC2 server once):

```bash
# 1. Make sure DNS for sustainability.dgrvcoop360.com points to the EC2 IP and
#    Cloudflare is proxying (orange cloud) the record.
#
# 2. Install certbot on the EC2 host:
sudo apt-get update
sudo apt-get install -y certbot

# 3. (Option A — HTTP-01 challenge). Briefly allow inbound 80 from anywhere,
#    then run (stop Nginx on port 80 first if it is already serving):
sudo certbot certonly --standalone -d sustainability.dgrvcoop360.com

# 3. (Option B — DNS-01 via Cloudflare). Install the cloudflare plugin:
sudo apt-get install -y python3-certbot-dns-cloudflare
#    Provide a Cloudflare API token in /etc/letsencrypt/cloudflare.ini:
#    dns_cloudflare_api_token = <TOKEN>
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d sustainability.dgrvcoop360.com

# 4. Copy / link the issued certs into the project ssl/ directory:
sudo cp /etc/letsencrypt/live/sustainability.dgrvcoop360.com/fullchain.pem ./ssl/nginx.crt
sudo cp /etc/letsencrypt/live/sustainability.dgrvcoop360.com/privkey.pem   ./ssl/nginx.key
sudo chown $(id -u):$(id -g) ./ssl/nginx.crt ./ssl/nginx.key
```

The Nginx container mounts `./ssl` as `/etc/nginx/ssl` (read-only) and serves
the Let's Encrypt certificate. Keycloak also uses the same cert via
`/etc/x509/https/`.

### 2.3 Cloudflare configuration

| Setting | Value |
|---------|-------|
| DNS record | `sustainability.dgrvcoop360.com` → A record → `158.220.84.249` (proxied / orange cloud) |
| SSL/TLS mode | **Full (Strict)** |
| Always Use HTTPS | On |
| Min TLS version | 1.2 |
| WAF | Managed rules + custom rules to block direct access to backend/Keycloak ports |
| Rate limiting | Enabled on `/keycloak/realms/*/protocol/openid-connect/token` and `/api/*` |

Full Strict means Cloudflare validates the origin certificate on the EC2 host,
so the Let's Encrypt cert must be valid and not expired.

### 2.4 Automatic renewal

Let's Encrypt certificates are valid for 90 days. Configure automatic renewal
with a deploy hook that restarts the Nginx container so the new cert is loaded:

```bash
# Add a renewal deploy hook (Certbot copies this to the renewal config dir):
cat <<'EOF' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh
#!/bin/bash
cp /etc/letsencrypt/live/sustainability.dgrvcoop360.com/fullchain.pem "$(dirname "$0")/../../../../<project>/ssl/nginx.crt" 2>/dev/null
cp /etc/letsencrypt/live/sustainability.dgrvcoop360.com/privkey.pem   "$(dirname "$0")/../../../../<project>/ssl/nginx.key" 2>/dev/null
cd /home/<user>/<project> 2>/dev/null && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart frontend
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-nginx.sh

# Verify the timer is active:
sudo systemctl enable --now certbot.timer
sudo certbot renew --dry-run
```

> In the simplest invocation, after renewal Certbot copies the new certs into
> `./ssl/` and the `--deploy-hook` restarts the frontend container. Make sure
> the `<project>` path in the hook points to the actual repo clone on the
> server.

---

## 3. Deployment Procedure (SSH → pull → up)

These are the exact production deployment steps an operator follows:

```bash
# 1. SSH into the production server
ssh ubuntu@158.220.84.249          # or the configured SSH user

# 2. Navigate to the project directory (the working git clone of the repo)
cd /home/<user>/DGAT-sustainability

# 3. Pull the latest code and images
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# 4. (If the backend image was not pushed by CI) build it on the host:
#    docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend

# 5. Apply the updated stack. Migrations run automatically via the
#    `migrate` one-shot container before the backend starts.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Confirm health
docker compose ps
curl -kfsS https://localhost/health          # Nginx health
docker compose exec backend curl -fsS http://localhost:3001/api/health  # Backend health
```

### What each step does

- **`git pull origin main`** — updates scripts, docker-compose files,
  keycloak realm export, and any other repo-owned files. `.env` is **not**
  overwritten by git (it is gitignored), which protects production secrets.
- **`docker compose ... pull`** — pulls the latest frontend (and backend, if
  available in the registry) images tagged `:latest`.
- **`docker compose ... up -d`** — recreates changed containers, runs the
  one-shot `migrate` container (which applies any pending SeaORM migrations
  idempotently), waits until it's healthy/complete, then (re)starts the
  backend and frontend.
- **Migrations** — SeaORM tracks applied migrations in the `seql_migrations`
  metadata table, so redeploys are safe. There is no automated downgrade; see
  BACKUP_RESTORE.md to restore the DB if a migration must be reverted.

### First-time server setup

```bash
# On a fresh EC2 instance:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin postgresql-client-17 certbot
sudo systemctl enable --now docker

git clone https://github.com/ADORSYS-GIS/DGAT-sustainability.git
cd DGAT-sustainability
cp .env.example .env
# Edit .env with production secrets (POSTGRES_PASSWORD, KEYCLOAK_ADMIN_PASSWORD,
# EMAIL_* , SSL domain, etc.) — see .env.prod for the production template.

# Generate / obtain SSL certificates (see §2), then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 4. Docker Images

| Image | Base | Final base | Multi-stage? |
|-------|------|-----------|--------------|
| Backend | `rust:1.88.0-slim-bookworm` | `debian:bookworm-slim` | Yes (`infrastructure/Dockerfile.backend`) |
| Frontend | `node:20-slim` | `nginx:alpine` | Yes (`infrastructure/Dockerfile.frontend`) |
| Keycloak | `quay.io/keycloak/keycloak:26.3.1` | — | Official image |
| PostgreSQL | `postgres:17-alpine` | — | Official image |

Both backend and frontend use multi-stage Dockerfiles to keep the final image
small. The backend image contains both the API binary (`/app/sustainability-tool`)
and the migrator binary (`/app/db-migrator`).

### Manual image build & push (fallback)

If CI did not build/push the backend image, build and push both manually:

```bash
# From a machine with Docker and push access to GHCR:
docker login ghcr.io -u <github-user> --password <PAT with write:packages>
bash scripts/push_images.sh
# Then SSH to the server and run: docker compose pull && docker compose up -d
```

`scripts/push_images.sh` runs `docker compose build` then pushes
`ghcr.io/adorsys-gis/dgat-sustainability/backend:latest` and `.../frontend:latest`.

---

## 5. Health Checks

| Service | Check | Interval |
|---------|-------|----------|
| Backend | `curl http://localhost:3001/health` | 30s |
| Frontend | `curl -kfsS https://localhost/health` | 30s |
| Keycloak | TCP probe to `/keycloak/health/ready` (prod) or `exit 0` (dev) | 30s |
| PostgreSQL (App) | `pg_isready` | 10s |
| PostgreSQL (Keycloak) | `pg_isready` | 10s |

The frontend container waits for `openapi.json` to exist in the shared volume
(copied there by the `openapi-fetcher` container) before starting Nginx, so a
healthy frontend implies the backend's spec was successfully fetched.

### Diagnostic endpoints & scripts

```bash
curl -kfsS https://sustainability.dgrvcoop360.com/health        # Nginx /health
curl -fsS  https://sustainability.dgrvcoop360.com/api/health     # Backend /api/health
bash scripts/diagnose-performance.sh                         # System + Docker + DB health snapshot
docker compose logs -f backend                               # Tail backend logs
```

---

## 6. Security hardening checklist

Action items to harden the production deployment:

- [ ] **Restrict EC2 security group** to allow inbound only from Cloudflare IP
      ranges on 443, and from trusted admin IPs on the SSH port. Block public
      access to backend (3002) and Keycloak (8081) host ports entirely.
- [ ] **Change default credentials**: `.env` defaults (`postgres`, `admin123`)
      must be changed for production.
- [ ] **Manage secrets securely**: move `KEYCLOAK_ADMIN_PASSWORD`,
      `POSTGRES_PASSWORD`, `EMAIL_PASSWORD` to Docker secrets, AWS Secrets
      Manager, or a vault — not plaintext `.env`.
- [ ] **Enforce SSH MFA/IP allow-listing** via AWS security groups or a bastion
      host.
- [ ] **Enable Cloudflare WAF rules** to block direct access to backend/Keycloak
      ports and rate-limit the token endpoint.
- [ ] **Automate Certbot renewal** with a deploy hook that restarts the frontend
      container (see §2.4).
- [ ] **Add image vulnerability scanning** to CI (`trivy`/`grype`).
- [ ] **Enable CloudTrail / CloudWatch** for audit logging of EC2 access and
      container metrics.