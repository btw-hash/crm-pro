# RUNBOOK — path to a production launch with real data

An end-to-end checklist so nothing gets missed. Mark `[x]` as you go.

## Sequencing principle

- **Now (safe to do):** a production-grade deploy (Docker/Compose/CI) on
  anonymized/synthetic data + start the customer's legal track in parallel.
- **Once the legal track + ERP integration are ready:** stand up a real production
  server and bring in real data.
- **NEVER ahead of time:** don't load real PII into any service until data residency
  is in place (data controller status + a certified/compliant hosting segment). See
  `DATA_POLICY.md`.

---

## Track 0 — Deploy foundation (team) — partially DONE

- [x] `output: "standalone"` in `next.config.ts`
- [x] `Dockerfile` (multi-stage, non-root, healthcheck) + `.dockerignore`
- [x] `docker-compose.yml` (app + Caddy auto-HTTPS) + `Caddyfile`
- [x] `.env.example` documents every variable needed for a cloud deploy
- [ ] Build and test the Docker image locally (`docker build`, `docker compose up`) —
      wherever Docker is available to you
- [ ] Register a domain and delegate DNS
- [ ] IaC for VM provisioning (Terraform or similar) — not started, currently manual
      (see `DEPLOY.md` TODO)
- [ ] A CI-driven deploy workflow — CI (`ci.yml`) currently only runs quality gates; no
      deploy step yet

---

## Track 1 — Legal (customer) — start IN PARALLEL now

- [ ] Confirm the customer's registration as **data controller**
- [ ] File/verify the **regulator notice** for processing PII, if the applicable regime
      requires one
- [ ] Prepare **subject consents** (customer contact persons) and a data processing
      notice
- [ ] Produce a **threat model** for the PII system (informed by the hosting provider's
      compliance documentation)
- [ ] If anonymized data will ever cross borders — a separate **pre-transfer notice**
      where required
- [ ] Name an owner responsible for PII processing

---

## Track 2 — Cloud hosting (once the legal track is ready)

- [ ] Open a cloud account for the customer's entity (billed on their account)
- [ ] Enable a **certified/compliant hosting segment**, obtain the **compliance
      certificate** and a threat-model summary
- [ ] Create a **service account** + key; configure least-privilege IAM (CI gets its
      own service account)
- [ ] Set up a **container registry** for images
- [ ] Managed **PostgreSQL** in the certified segment (once we move off in-memory)
- [ ] A **secrets manager** for production secrets (no developer access)
- [ ] Provision the VM (manual today — see `DEPLOY.md` TODO for IaC)
- [ ] Point the domain's **A record** at the VM's public IP

---

## Track 3 — Data (residency & privacy) — see `DATA_POLICY.md`

- [ ] **Checklist of every PII field** in the ERP (counterparties, contact persons,
      contracts, phone/email/tax ID/passport/address, free text)
- [ ] **A deterministic anonymization pipeline** for the dev copy (inside the approved
      environment), with free text stripped entirely
- [ ] Publish the **anonymized dev database** for the team (safe to hold anywhere)
- [ ] Document: **a raw ERP export never leaves the approved environment**
- [ ] Two-tier **LLM policy**: real PII → only the approved compliant provider; code/
      anonymized data → global models

---

## Track 4 — CI/CD and deploy (team)

- [ ] Add the registry, deploy host, deploy user, and deploy key as GitHub Secrets
- [ ] Build a deploy workflow (build → push → SSH deploy), test it with a manual run
- [ ] On the VM: install Docker, clone the repo (or ship `docker-compose.yml`), create
      `.env` from the secrets manager
- [ ] First deploy: `docker compose up -d --build`; verify `/api/health` and TLS
- [ ] Later — auto-deploy on `main` after green CI

---

## Track 5 — Security and operations (Ops)

- [ ] **Secrets:** 1Password (dev) + a secrets manager (prod); 2FA for everyone;
      separate stores for dev/prod
- [ ] **Secret scanning:** gitleaks/GitGuardian in pre-commit and CI; GitHub Push
      Protection
- [ ] **Backups:** managed PostgreSQL (automatic) + a tested restore
- [ ] **Monitoring/logs:** uptime, errors, resource use; alerts on `/api/health` failing
- [ ] **Updates:** regular `npm audit`/dependency and base-image updates
- [ ] **Access:** least-privilege IAM roles, production access audit log, a small
      circle of people with access
- [ ] **Firewall:** only 80/443 exposed; SSH by key, only from your IP range

---

## 🚦 GATE — before the first production release with REAL PII

Do not switch production over to real data until EVERYTHING below is done:

- [ ] Legal track closed (data controller status, regulator notice, consents, threat
      model)
- [ ] Production runs in a certified hosting segment (certificate in hand); the PII
      database lives only inside the approved environment
- [ ] The anonymization pipeline works; only synthetic data ever leaves the approved
      environment
- [ ] The LLM for PII calls is the approved compliant provider; global models never see
      real PII
- [ ] Secrets live in the secrets manager; no secrets/PII in the repository
      (secret-scan green)
- [ ] Backups and restore are tested; monitoring and alerts are on
- [ ] `main` is protected, review is mandatory (human + AI), CI is required

### Security (from an adversarial infrastructure review)

- [ ] Base images pinned by sha256 digest (node, caddy, postgres, dockerfile syntax)
- [ ] CI scans the image for CVEs (Trivy/Grype) + an SBOM artifact before pushing to the
      registry
- [ ] Secret scanning (gitleaks) in CI/pre-commit + GitHub Secret Scanning / Push
      Protection enabled
- [ ] GitHub Actions pinned by commit SHA (Dependabot keeps the pins current)
- [ ] A protected `production` environment with required reviewers; deploy only from
      `main`; secrets are environment-scoped
- [ ] Cloud authentication via OIDC/federation instead of a static service-account key;
      deploy keys rotated
- [ ] Deploy by immutable tag + a healthcheck gate after `up` + a documented rollback
      procedure
- [ ] Containers: `read_only` filesystem + `cap_drop: ALL` (+ `NET_BIND_SERVICE` for
      Caddy) + tmpfs — enabled and tested
- [ ] Production secrets via docker secrets / the secrets manager (file-based), not
      `environment:`
- [ ] Image signing (cosign) and signature verification at deploy time
- [ ] `branch protection` actually enabled on `main`; CODEOWNERS lists real logins
- [ ] Data Processing Agreements signed with the cloud host and the LLM provider
- [ ] An incident response plan is adopted (`docs/INCIDENT_RESPONSE.md`); notification
      deadlines are documented
- [ ] A retention/destruction schedule for PII is defined (`docs/DATA_POLICY.md`)

---

## ⛔ What NOT to do ahead of time

- Don't stand up a paid certified/compliant cluster "just in case" before the app and
  the legal track are ready.
- Don't load real PII into a demo/staging environment outside the approved hosting
  segment — synthetic data only there.
- Don't take a raw ERP export outside the approved environment, under any
  circumstances.
