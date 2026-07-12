# Deploy CRM Pro (Docker Compose, any Linux VM)

Step-by-step runbook for a stateful cloud deploy (Postgres behind the ports,
`PERSISTENCE_MODE=postgres`). Related: [DATA_POLICY.md](DATA_POLICY.md) (data
residency), `docker-compose.yml`, `Dockerfile`, `Caddyfile`, `.env.example`.

## TL;DR

The code and infrastructure scaffolding are ready. Three stages, in increasing order of
readiness for real data:

- **Path A — demo/staging (synthetic data).** No real PII → no compliance gate needed. A
  live URL for the customer in a day or two on minimal infrastructure.
- **Path B-prep — pre-production (synthetic data on the PRODUCTION architecture).** ⭐
  The recommended bridge: stand up a prod-grade environment (managed Postgres, a
  secrets manager, a domain, a deploy pipeline, the live LLM, ERP over OData through the
  fake ERP) — but **on synthetic data**, so the legal gate for real PII still doesn't
  apply. Run everything end-to-end ahead of time; go-live later is a config/data swap,
  not a re-architecture.
- **Path B — production with real PII.** Gated by the customer's legal/compliance track
  (data controller status + an approved, compliant hosting segment). Differs from
  B-prep only in the data, the real ERP connection, and the hosting segment's
  certification status.

All stages share the artifacts below; the differences live in the "B-prep" and "B"
sections.

## What's already in the repository

| Artifact                        | Purpose                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                    | Multi-stage build, Next standalone output, healthcheck `/api/health`                                             |
| `docker-compose.yml`            | Production composition: `app` (hardened) + `caddy` (auto-HTTPS) + `db` (Postgres, for dev/demo)                  |
| `docker-compose.demo.yml`       | Demo/pre-prod stack: `db` + `migrator` (migrate deploy + seed) + `mock-erp` (ERP over OData) + `app` + `adminer` |
| `Caddyfile`                     | Reverse proxy `{$DOMAIN}` → `app:3000`, Let's Encrypt TLS, security headers                                      |
| `.github/workflows/ci.yml`      | Quality gate on push/PR (typecheck + lint + format + test + build); no deploy step yet — see TODO                |
| `prisma/migrations/0_init`      | Init migration for the whole schema (21 tables). Applied via `npm run db:deploy`                                 |
| `npm run db:deploy` / `db:seed` | `prisma migrate deploy` / seed demo data                                                                         |

There is no IaC (Terraform/Pulumi/etc.) in this repo yet — provisioning a VM below is a
manual, one-time step; see the TODO section for automating it.

## Environment variables (`.env` on the server)

The full list lives in `.env.example`. Never commit real values (for production, use a
secrets manager or docker secrets, not plain `environment:`). Minimum for a cloud deploy:

```bash
PERSISTENCE_MODE=postgres
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>?schema=public
DOMAIN=crm.example.com          # Caddy will get a TLS cert for this domain
AUTH_OPTIONAL=false             # login is mandatory in prod anyway (this flag is ignored there)
# AI: demo -- stub or openai; prod (real PII) -- ONLY openai (the approved provider)
AI_MODE=stub                    # or live
AI_PROVIDER=openai              # for live; the global model (anthropic) is blocked in prod (see DATA_POLICY.md)
AI_API_KEY=                     # from the secrets manager, not from git
# ERP: demo -- stub (seed data); prod -- odata against the real ERP publication
ERP_MODE=stub
```

---

## Path A — demo/staging (synthetic data)

Goal: a live URL to show the customer. No real PII (seed data only), so an ordinary
Linux VM with no special compliance segment is fine.

### A1. Provisioning (manual — any cloud provider or on-prem host)

Spin up a Linux VM (2 vCPU / 2 GB RAM / 20 GB disk is enough) with a public IP, opening
only 80/443 inbound (plus SSH from your own IP range). Any provider works — this repo
doesn't pin one.

**Database for the demo** — either the containerized `db` service from
`docker-compose.yml`, or a managed PostgreSQL instance from your provider (create it in
their console and use its `DATABASE_URL`).

### A2. Shipping the app to the VM

Over SSH: install Docker + Compose, pull the code, drop in `.env`:

```bash
ssh user@<vm_public_ip>
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
git clone <repo-url> crm-pro && cd crm-pro
cp .env.example .env && nano .env               # fill in per the section above
sudo docker compose up -d --build                # app + caddy + db
```

### A3. Schema + demo data (migration)

**Important:** the production image (the `runner` stage) is minimal and does **not**
include the Prisma CLI — run the migration from a separate one-off container built from
the `builder` stage instead. See [Migrations at deploy time](#migrations-and-seeds-at-deploy-time).

```bash
# Compose network name (usually <folder>_default) so the one-off container can reach db.
NET=$(sudo docker network ls --format '{{.Name}}' | grep default | head -1)
sudo docker build --target builder -t crm-pro-builder .
sudo docker run --rm --env-file .env --network "$NET" crm-pro-builder npm run db:deploy
sudo docker run --rm --env-file .env --network "$NET" crm-pro-builder npm run db:seed
```

(For a managed PostgreSQL instance, `--network` isn't needed — `DATABASE_URL` reaches it
directly.)

### A4. Domain + HTTPS

Point the domain's A record at the VM's public IP. Caddy on the VM will obtain and renew
a Let's Encrypt certificate for `$DOMAIN` (ports 80/443 are already open). For a local
test, `DOMAIN=localhost` (self-signed).

### A5. Verify

```bash
curl -fsS https://$DOMAIN/api/health        # 200
```

Open `https://$DOMAIN`, log in with a demo account (`a.peterson` / `demo1234`), and
confirm data survives a restart (`docker compose restart app`).

---

## Path B-prep — pre-production (production architecture, synthetic data) ⭐

**Why:** get a stand that "does everything production does" and run it end-to-end
BEFORE the legal track closes. As long as the data is synthetic/anonymized, no
compliance obligations (regulator notice, a certified hosting segment) apply yet — the
production architecture can be built now. Go-live later is a config/data swap, not a
re-architecture.

> The legal nuance is for the customer's counsel; the engineering principle is: as long
> as there's no real PII, a prod-grade stand on synthetic data is fine in an ordinary
> (not necessarily certified) hosting segment.

### Base — `docker-compose.demo.yml` (already in the repo)

`db` + `migrator` (`migrate deploy && db:seed`) + `mock-erp` + `app` + `adminer`. Key
point: `app` talks to "the ERP" over the **real OData integration code**
(`ERP_MODE=odata`, `ERP_BASE_URL=http://mock-erp:8108`) — the real integration path
runs, just against a fake ERP. This is the core of pre-production; on real
infrastructure, only what's listed below changes.

### Steps (all on synthetic data, no compliance gate yet)

1. **Provisioning** as in Path A (VM + domain), but the database is **managed
   PostgreSQL** (backups/HA) instead of the containerized `db`; point `DATABASE_URL` at
   it.
2. **Secrets — a secrets manager** (with demo/test keys for now): rehearse delivering
   file-based secrets to the VM — this validates the production secrets pipeline ahead
   of time.
3. **Stack:** start from `docker-compose.demo.yml` (keep `migrator` + `mock-erp`), swap
   `db` for managed PostgreSQL; add `caddy` + a `staging.crm.example.com` domain + TLS;
   turn on hardening (`cap_drop`/`read_only`/`tmpfs`).
4. **AI — the approved provider against synthetic data:** `AI_MODE=live`,
   `AI_PROVIDER=openai`, a real key. This validates the compliant-provider path +
   pseudonymization + the data-contour guard (all already in the code) before any real
   PII goes through them.
5. **ERP — the fake ERP over OData** (`ERP_BASE_URL=http://mock-erp:8108`): real
   integration code, synthetic documents.
6. **Deploy pipeline:** there is no automated deploy workflow in this repo yet (see
   TODO) — for now, redeploy manually over SSH (`git pull && docker compose up -d
--build`). Rehearse a deploy and a rollback by hand before automating it.
7. **Migrations:** the `migrator` service (`migrate deploy` + a demo `seed`).
8. **Monitoring/alerts/backups** for the managed Postgres instance.
9. **End-to-end check:** domain+TLS, `/api/health`, data survives a restart, login
   (`AUTH_OPTIONAL=false`), voice→report through the approved LLM provider, an order
   lands in the fake ERP over OData.

### Checklist: "ready to flip to production"

Once pre-production is fully green, go-live is **only these swaps** (the legal track
runs in parallel):

- [ ] Legal track closed: data controller status + regulator notice + a certified
      hosting segment.
- [ ] `ERP_BASE_URL` → the real ERP publication (**no code changes**).
- [ ] Real users instead of `demo1234`; the demo `seed` is disabled.
- [ ] Real customer PII loaded into the certified hosting segment;
      `ALLOW_GLOBAL_LLM` is empty.

### What pre-production explicitly does NOT do

No real PII is loaded; the real ERP isn't connected; a certified hosting segment isn't
required (it's added at the flip). Everything else is production-grade.

---

## Path B — production with real PII

Technically = Path B-prep + a closed legal track + real data. **Legal preconditions
(without these, don't provision production infrastructure):**

1. The customer has registered as a **data controller** and filed any required
   **regulator notice**.
2. A **certified/compliant hosting segment** is enabled with the chosen provider.
3. **Data Processing Agreements** are signed with third-party processors (the cloud
   host, the LLM provider) — see [DATA_POLICY.md](DATA_POLICY.md).

The base architecture comes from **Path B-prep** (managed Postgres, secrets manager, the
approved LLM provider, OData, hardening, domain, deploy). Going live ADDS only what's
tied to real data:

- **Segment:** the managed database and the app run inside the **certified hosting
  segment** (pre-production allowed an ordinary one).
- **ERP:** `ERP_BASE_URL` → the **real ERP publication** instead of the fake ERP (access
  is blocker #1/#15). No code changes.
- **Seeds:** do **not** run the demo `db:seed`; apply only the schema via `npm run
db:deploy`. Real users are provisioned separately (see "Production users" below).
- **AI:** `AI_PROVIDER=openai`, `ALLOW_GLOBAL_LLM` stays empty (the global provider is
  blocked by the `assertProviderCompliant` guard — don't bypass it).
- **Logs:** no PII, collected inside the approved hosting environment (see
  DATA_POLICY.md).

### Production users

In the demo, accounts are seeded from `seedUsers` (password `demo1234`). That's not
acceptable in production:

- Either provision real users via a data migration/script (hash with
  `ScryptPasswordHasher`, password set by an admin), or
- integrate with an identity source (the ERP/SSO) — a separate task.

---

## Migrations and seeds at deploy time

**Root of the problem:** the `Dockerfile`'s `runner` stage (what actually runs in
production) is minimal — just `.next/standalone` + static assets — it has **no Prisma
CLI, schema, or tsx**, so `npm run db:deploy`/`db:seed` can't run from the production
container itself.

**Approach 1 (no Dockerfile changes needed, recommended for now):** a one-off container
from the `builder` stage — it has everything (see the commands in A3). Idempotent:
`migrate deploy` only applies new migrations, `db:seed` upserts.

**Approach 2 (a proposal — needs team agreement):** add an opt-in profile to
`docker-compose.yml` so `docker compose --profile migrate run --rm migrate` works:

```yaml
# One-off migration run (and seeding for the demo). Not started by a normal `up`.
migrate:
  profiles: ["migrate"]
  build:
    context: .
    target: builder
  env_file: .env
  command: sh -c "npm run db:deploy" # demo: "npm run db:deploy && npm run db:seed"
  depends_on:
    db:
      condition: service_healthy
  restart: "no"
```

**Production order:** `migrate deploy` runs BEFORE traffic is switched to the new
version; the demo `seed` — never in production.

---

## Rollback and backups

- **App rollback:** deploy from an immutable image tag (e.g. `git rev-parse HEAD`), not
  `latest` → rollback = run the previous tag.
- **Schema rollback:** Prisma's `migrate deploy` only applies forward; a reverse
  migration is a separate script. Take a database snapshot before applying migrations in
  production.
- **Backups:** managed PostgreSQL — automatic; for the containerized `db` (demo only) —
  `pg_dump` the `db_data` volume.

## Pre-production-launch checklist (Path B)

- [ ] Data controller status registered, regulator notice filed.
- [ ] Certified hosting segment enabled; Data Processing Agreements signed.
- [ ] Managed PostgreSQL provisioned; `DATABASE_URL` from the secrets manager; the
      containerized `db` disabled.
- [ ] `npm run db:deploy` applied to the production database; the demo `seed` was NOT
      run.
- [ ] Real users provisioned (not `demo1234`); `AUTH_OPTIONAL` is moot (login is
      mandatory).
- [ ] `AI_PROVIDER=openai`, `ALLOW_GLOBAL_LLM` empty; `ERP_MODE=odata` against the real
      ERP.
- [ ] `docker-compose` hardening enabled and tested; logs contain no PII.
- [ ] Domain + TLS working; `/api/health` returns 200; data survives a restart.
- [ ] An automated deploy pipeline exists (see TODO) with a migration step.

## TODO (infrastructure follow-ups)

- Add IaC (e.g. Terraform) for VM provisioning — currently manual.
- A CI-driven deploy workflow (build → push → SSH deploy → healthcheck gate → rollback
  procedure) — currently a manual SSH deploy.
- A migration step wired into that deploy workflow (Approach 2 above) — needs team
  agreement.
- Monitoring/alerts, secret rotation.
