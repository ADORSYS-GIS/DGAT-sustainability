# IT Review Meeting — Answers to Open Questions

This document answers every checkbox/open question raised in
[IT_REVIEW_MEETING.md](IT_REVIEW_MEETING.md). Answers are grounded in the
codebase (file references are quoted where relevant) and clearly flag any item
that is a **decision/action for the receiving team** at handover.

---

## Section 4 — Deployment

### Open Questions (4.5)

**Q: What is the current VM/EC2 spec (CPU, RAM, disk)?**
A: The production stack is a single EC2 instance (IP `158.220.84.249`, per
`.env.prod`). The exact instance type is not recorded in the repository. The VM
has a **100 GB disk**. The stack runs 6 containers (frontend, backend, migrate
one-shot, keycloak, two PostgreSQL 17) 

**Q: Is there a staging environment, or is there only production?**
A: There is **only a production environment**. The `docker-compose.yml` serves as
the local dev environment. There is no staging server or staging Keycloak
realm. **Action:** introduce a staging stack (separate `.env.staging` and a
dedicated EC2 or subdomain) before the next major release.

**Q: Are there any CDN or load balancer in front of the server?**
A: **Cloudflare** sits in front of the EC2 instance and provides DNS, CDN
caching, TLS termination, WAF, DDoS protection, and rate limiting. There is no
separate load balancer because there is a single EC2 host (single‑server
deployment). See [ARCHITECTURE.md](ARCHITECTURE.md) §3 and DEPLOYMENT.md §2.3.

**Q: What is the DNS configuration?**
A: `sustainability.dgrvcoop360.com` is managed via Cloudflare. An A record points to
`158.220.84.249` and is proxied (orange cloud). The Nginx `server_name` is
templated via `envsubst` using `SERVER_NAME` (`frontend/nginx.conf.template`).
See DEPLOYMENT.md §2.3.

**Q: What Cloudflare plan is in use?**
A: Not recorded in the repository. **Action:** confirm with the Cloudflare
account owner which plan (Free / Pro / Business / Enterprise) is active — this
affects WAF capabilities and rate-limit quotas.

**Q: What is the Cloudflare SSL mode?**
A: **Full (Strict)**. Cloudflare validates the origin's Let's Encrypt
certificate. The origin Nginx must therefore present a valid, non-expired cert.
See DEPLOYMENT.md §2.3.

**Q: Are Cloudflare firewall rules configured? What zones are protected?**
A: Cloudflare is used for WAF and rate limiting, but the exact firewall rules
are not stored in the repo. 

**Q: Who has access to the production server?**
A: Not documented in the repository. **Action:** document the list of SSH users,
the SSH key owners, and the AWS IAM users with EC2 access. Enforce SSH key-only
login and IP allow-listing via the security group.



**Q: Is there a rollback procedure if a deployment fails?**
A: Rollback is **manual**. Pull a known-good image tag from GHCR or re-run
`push_images.sh` for a previous commit, then `docker compose up -d`. If
migrations have run forward-only and are incompatible, restore the DB from the
last backup (BACKUP_RESTORE.md). See CICD_PIPELINE.md §5.

---

## Section 5 — Recovery & Backup

### Open Questions (5.4)

**Q: Is the cron job for automated backups actually set up on the production server?**
A: `scripts/backup.sh` is written to be run from cron (daily at 02:00), but the
repo does not record whether the crontab entry exists on the server. **Action:**
confirm `crontab -l` on the production host contains
`0 2 * * * /path/to/scripts/backup.sh >> /var/log/sustainability-backup.log 2>&1`.
See BACKUP_RESTORE.md §Scheduling.

**Q: Is `rclone` configured for off-site backup uploads?**
A: Off-site upload is **optional** and only triggers when `RCLONE_REMOTE` and
`RCLONE_BUCKET` are set. The backup script handles upload + remote pruning if
configured. **Action:** decide the off-site target (AWS S3 / B2 / MinIO), run
`rclone config` on the server, and export the two variables in the cron
environment. See BACKUP_RESTORE.md §Off-site Upload.

**Q: What is the RPO (Recovery Point Objective)? Is 24 hours acceptable?**
A: The default backup schedule is **daily** (cron at 02:00), giving an RPO of ≤
24 hours. This is acceptable for the current low-volume cooperative assessment
workload. **Action:** confirm 24-hour RPO with the business owner; if a shorter
RPO is needed, increase cron frequency (e.g. every 6 hours) and enable rclone
off-site upload.

**Q: What is the RTO (Recovery Time Objective)?**
A: With the restore script, a planned DB-only restore completes in minutes; a
full new-server rebuild (install Docker, clone, restore, up) takes ~30–60
minutes. The current single-server design gives an RTO of about 1 hour. There is
no warm standby. **Action:** confirm this RTO is acceptable for the business; if
not, provision a standby EC2 and pre-script the rebuild.

**Q: Are backups tested periodically (restore drill)?**
A: Not currently enforced or documented. **Action:** schedule a monthly restore
drill on a throwaway VM (run `restore.sh ... all` against a fresh
`docker compose up` stack) and log the result.

**Q: Is there a disaster recovery plan for total server loss?**
A: **Scenario 2** in BACKUP_RESTORE.md documents the procedure for a full
instance failure (new server rebuild). Off-site backups (once rclone is
configured) make full DR possible. **Action:** keep at least one off-site backup
copy and document the DR runbook contact + cloud account ownership.

**Q: Where are the production `.env` secrets stored securely?**
A: Production secrets currently live in the plaintext `.env` file on the server
(gitignored). This is a **risk**. **Action:** move secrets to Docker secrets,
AWS Secrets Manager / Systems Manager Parameter Store, or a vault. The default
`.env.example` values (`postgres`, `admin123`) **must** be changed in production.
See DEPLOYMENT.md §6.

---

## Section 6 — Server Access

### Open Questions (6.6)

**Q: Who has SSH access to the production server? Is it documented?**
A: Not documented in the repo. **Action:** produce an access roster (names,
SSH key fingerprints, EC2 security-group IP allow-lists) and keep it with the
handover documentation.

**Q: Is there a firewall (security group) restricting access to ports 3002 and 8081?**
A: The compose files expose port `3002` (backend) and `8081` (Keycloak) on the
host for diagnostics. Whether the AWS security group blocks public access to
them is not recorded in the repo. **Action:** configure the EC2 security group
to deny inbound `3002` and `8081` from the public internet, allowing only
Cloudflare IP ranges on 443 and admin IPs on SSH. See DEPLOYMENT.md §6.

**Q: Are there any rate limiting or DDoS protection measures in place?**
A: **Cloudflare** provides DDoS protection and configurable rate limiting.
Backend-level rate limiting is not implemented in the Rust app. **Action:**
enable Cloudflare rate-limiting rules on `/keycloak/realms/*/protocol/openid-connect/token`
and on `/api/*`, and consider adding `tower::limit` in the backend if needed.

**Q: Is HTTPS terminated at Cloudflare, or does Nginx also enforce HTTPS?**
A: Both. Cloudflare terminates TLS at the edge, then re-encrypts to the origin
in **Full (Strict)** mode. Nginx also listens on 443 with the Let's Encrypt
certificate and redirects HTTP→HTTPS (`nginx.conf.template`). See DEPLOYMENT.md
§2.3.

**Q: Are Cloudflare firewall rules in place?**
A: Cloudflare is configured for WAF/DDoS, but the specific rules are not stored
in the repo. **Action:** confirm the WAF managed rules and custom rules (block
direct backend/Keycloak port access, rate-limit token endpoint) are in place.

**Q: Is Certbot auto-renewal configured and tested? Does the deploy hook restart Nginx?**
A: The infrastructure is set up to use Certbot + Let's Encrypt with auto-renewal,
but whether the systemd timer and deploy hook are installed on the server is not
recorded. **Action:** install/verify `certbot.timer`, add the deploy hook that
copies the renewed certs into `./ssl/` and restarts the frontend container, and
run `certbot renew --dry-run`. See DEPLOYMENT.md §2.4.

**Q: Are SSL certificates properly managed and renewed? (Certbot + Cloudflare)**
A: Yes — production uses Let's Encrypt certs on the origin and Cloudflare Full
Strict on the edge. The only gap is verified automation of renewal (see previous
question). See DEPLOYMENT.md §2.


**Q: How are application secrets managed?**
A: Currently via the plaintext `.env` file. **Action:** migrate to a secrets
manager (Docker secrets / AWS Secrets Manager / Vault) and rotate the default
credentials. See DEPLOYMENT.md §6.

**Q: What Cloudflare SSL mode is configured? (Should be Full Strict)**
A: **Full (Strict)**. Confirmed by design intent and the Let's Encrypt origin
cert. See DEPLOYMENT.md §2.3.

---

## Section 8 — Questions Template (Fill During Meeting)

### Technology Stack
- **Are there any planned technology changes or upgrades?** No major planned
  changes are encoded in the repo. The stack is Rust/Axum + SeaORM on the
  backend and React/Vite on the frontend, intended to be stable. **Action:** the
  receiving team may plan dependency upgrades (Keycloak 26.3.1 organizations is
  a preview feature — see below).
- **Is the current Rust version (1.88) aligned with the team's expertise?**
  Rust 1.88.0 stable is used (`infrastructure/Dockerfile.backend`,
  `rust-toolchain`). **Action:** confirm the receiving team has Rust capacity.
- **What is the plan for dependency updates and security patches?** CI does not
  currently run `cargo audit` / `npm audit` / Dependabot. **Action:** enable
  Dependabot and add `cargo audit` + `npm audit` to CI.
- **Is the Keycloak Organizations feature (preview) production-ready?**
  Keycloak is started with `KC_FEATURES=preview,organization`, so the
  Organizations feature is in **preview** (`docker-compose.yml`). **Action:**
  monitor Keycloak releases and, before scaling, validate whether the
  Organizations feature has become stable or migrate to a stable alternative
  (groups/attributes).

### Architecture
- **Is the single-server deployment sufficient for the expected load?**
  Yes for the current low‑volume cooperative usage. All services run on one EC2
  host via Docker Compose. There is no horizontal scaling. **Action:** monitor
  CPU/RAM; if concurrent users grow, split DB and backend to separate hosts.
- **What is the peak expected concurrent user count?** Not recorded. **Action:**
  capture the expected peak and validate via a load test.
- **Is there a plan for horizontal scaling if needed?** No plan is encoded.
  Postgres volumes and the session cache would need managed storage and a load
  balancer. **Action:** draft a scaling runbook (separate DB + backend → add
  backend replicas behind an LB → managed Postgres).
- **How will the offline/sync conflict resolution strategy be tested?**
  `syncService.ts` / `syncQueueService.ts` drain the IndexedDB queue on
  reconnect. There are no automated offline-conflict tests in CI.
  **Action:** add Vitest integration tests that simulate offline → queue →
  reconnect with conflicting server state. See OFFLINE_ARCHITECTURE.md.

### Development
- **What is the current development team size and velocity?** Not recorded.
  **Action:** capture in the handover.
- **Is the CI pipeline sufficient? Are there any gaps?** CI covers lint, build,
  test, docs, codegen, types, and frontend unit tests. Gaps: no backend image
  build/push in deploy, no image vuln scanning, no `cargo audit`/`npm audit`,
  no integration/E2E tests, SonarQube commented out. See CICD_PIPELINE.md §4.
- **What is the code review process?** Pull requests into `main`; required CI
  checks run on every PR. **Action:** confirm whether branch protection and
  required reviewers are configured on GitHub.
- **How are environment-specific configurations managed?** Via the `.env` file
  (`.env.example` template, `.env.prod` for production). The repo is the single
  source of truth for non-secret configuration; secrets live on the host.
  **Action:** migrate secrets to a secrets manager (DEPLOYMENT.md §6).

### Deployment
- **Is there a staging environment for testing before production?** No — only
  production and local dev. **Action:** add staging.
- **What is the rollback procedure?** Manual — pull a previous image tag or
  rebuild, then `docker compose up -d`; restore DB if migrations are
  incompatible. See CICD_PIPELINE.md §5 and DEPLOYMENT.md §3.
- **Are Docker images scanned for vulnerabilities?** No. **Action:** add
  Trivy/Grype to CI.
- **How are database schema migrations handled in production?** The one-shot
  `migrate` container runs the `db-migrator` binary, which applies SeaORM
  forward-only migrations tracked in the `seql_migrations` metadata table,
  before the backend starts. No automated rollback. See DATABASE_SCHEMA.md §5.

### Backup & Recovery
- **What is the backup schedule? Is it running?** Designed for daily 02:00 cron;
  whether it's actually installed must be confirmed on the server.
- **Where are backups stored? Is off-site configured?** Locally in `./backups`
  with 7-day retention; off-site is optional via rclone (30-day retention) and
  must be configured on the host. See BACKUP_RESTORE.md.
- **Has a restore drill been performed?** Not recorded. **Action:** run one
  monthly.
- **What are the RPO and RTO targets?** RPO ≤ 24 h (daily); RTO ≈ 1 h
  (single-server rebuild). See above.

### Server Access
- **Who has production server access?** Not documented. **Action:** produce an
  access roster.
- **Is access audited and logged?** AWS CloudTrail / EC2 instance logs are not
  configured in the repo. **Action:** enable CloudTrail and, if using Session
  Manager / bastion, ensure session logging.
- **Are there separate accounts for different team members?** Recommended —
  not currently recorded. **Action:** use individual AWS IAM users and OS users
  with unique SSH keys.
- **Is 2FA/MFA enforced for server access?** **Action:** enforce MFA on AWS IAM
  accounts and on the SSH jump host / SSM Session Manager.

### Security
- **Have default credentials been changed in production?** `.env.example`
  defaults (`postgres`, `admin123`) must be changed in `.env` on the server.
  **Action:** verify `KEYCLOAK_ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, and
  `EMAIL_PASSWORD` are non-default.
- **Is there a WAF or rate limiting in place?** Cloudflare WAF + rate limiting
  is the intended layer; specific rules must be confirmed.
- **Are SSL certificates properly managed and renewed?** Yes, via Certbot +
  Let's Encrypt + Cloudflare Full Strict; automation of renewal must be
  verified on the host.
- **Has a security audit been conducted?** No. **Action:** schedule one.
- **How are application secrets managed?** Currently plaintext `.env`;
  **Action:** migrate to a secrets manager.

---

## Section 7 — Summary of Action Items (consolidated)

| # | Category | Action Item | Priority | Owner |
|---|----------|------------|----------|-------|
| 1 | Security | Change default passwords in production `.env` | Critical | |
| 2 | Security | Restrict EC2 security group (block 3002/8081 public) | Critical | |
| 3 | Security | Verify/install Certbot auto-renewal timer + deploy hook | High | |
| 4 | Security | Move secrets to a secrets manager (Vault / AWS SM) | High | |
| 5 | Security | Add image vulnerability scanning (Trivy) to CI | High | |
| 6 | Security | Enforce SSH MFA / IAM MFA / IP allow-listing | High | |
| 7 | Backup | Verify backup cron is configured on the production server | High | |
| 8 | Backup | Configure `rclone` for off-site backup uploads | Medium | |
| 9 | Backup | Schedule periodic (monthly) restore drills | Medium | |
| 10 | Compliance | Conduct a security audit (OWASP-aligned) | High | |
| 11 | Deployment | Add staging environment | Medium | |
| 12 | Deployment | Extend `deploy.yml` to also build+push the backend image | High | |
| 13 | Deployment | Document rollback/DR runbook owners and contacts | Medium | |
| 14 | CI/CD | Enable Dependabot + `cargo audit` + `npm audit` | Medium | |
| 15 | CI/CD | Add E2E / offline-sync integration tests | Medium | |
| 16 | Infrastructure | Record EC2 instance type / specs and scaling plan | Medium | |
| 17 | Infrastructure | Confirm Cloudflare plan and WAF rule set | Medium | |
| 18 | Infrastructure | Document SSH access roster | High | |
| 19 | Monitoring | Set up CloudWatch / Prometheus monitoring & alerting | Medium | |