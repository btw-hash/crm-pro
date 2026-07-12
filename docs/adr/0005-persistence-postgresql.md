# ADR-0005: Persistence — PostgreSQL via Prisma

- **Status:** accepted (target state; enabling it needs team sign-off — see "Rollout")
- **Date:** 2026-06-24
- **Issue:** #134

## Context

Domain state owned by the CRM (deal stages, activities, audit records, sample requests,
`DealEvent`, notifications — see [ADR-0002](0002-system-of-record-and-idempotency.md))
currently lives in memory behind repository ports (`In-Memory*Repository`). That's
enough for development and demos, but not for production use: a service restart loses
everything, there's no concurrent access for 7 sales reps, and no history. We need to
fix the target store and the way it's enabled, without breaking clean architecture and
without making the database the default before it's ready.

Numbers/prices/stock are **not** stored in the CRM — they come from `ErpGateway`
(ADR-0002) and aren't part of the database schema. The database only stores what the CRM
owns.

## Decision

### 1. PostgreSQL + Prisma as the ORM

- **PostgreSQL** — the target database (reliability, concurrency, maturity; compatible
  with a future self-hosted/compliant deployment per the data-residency policy, unlike
  managed-only cloud offerings).
- **Prisma** — type-safe access, matches the project's strict-TS stack.
- The implementation is already built on the `feat/postgres-persistence` branch:
  `prisma/schema.prisma` + a `Prisma*Repository` for each port, alongside the existing
  `In-Memory*Repository`.

### 2. A `PERSISTENCE_MODE` switch, defaulting to `memory`

The source of truth is an env variable (`src/infrastructure/config/env.ts`):

```ts
PERSISTENCE_MODE: z.enum(["memory", "postgres"]).default("memory");
```

`composition-root` swaps in the repository set based on the flag. **The default stays
`memory`**: dev, tests, and demos don't need a running database; `postgres` is enabled
explicitly for staging/production. It's the same substitution pattern as `ERP_MODE`
(stub ↔ odata) — the database sits behind a port, use-cases don't change.

### 3. Enums stored as TEXT, not native database enums

In the schema, domain union types (stage, client type, …) are stored as `String`, not a
Postgres enum: domain unions change more often than we'd want to run enum migrations for.
Validity is enforced by the domain layer (Zod/TS), not the database. (Documented at the
top of `schema.prisma`.)

### 4. The boundary stays intact

Prisma lives only in `src/infrastructure/persistence`. The domain and use-cases only know
the port interfaces. Swapping memory↔postgres never touches `domain`/`application` — a
verifiable architectural property (review rule #1 in CLAUDE.md).

### 5. The ERP sync cursor

The "last sync cursor" state from [ADR-0004](0004-erp-sync-direction.md) is a candidate
for persistence here (in `memory` mode it resets on restart, which is acceptable only
for a demo).

## Rollout (needs team sign-off)

The `feat/postgres-persistence` branch is intentionally **without a PR** and not on
`main` — this is an architectural decision that touches infrastructure (Docker,
migrations, backups, deploy). Rollout order:

1. Sign off on this ADR (both developers).
2. Merge the branch via a PR on green CI — **the default stays `memory`**, dev/demo
   behavior doesn't change (the database stays dormant).
3. Stand up Postgres in the infrastructure (Docker Compose or other IaC) + a migration
   process (`prisma migrate`) + backups — a separate task before production use.
4. On staging, set `PERSISTENCE_MODE=postgres`, run the seed and the test scenarios.
5. Production — after migrations and backups are verified on staging.

Nothing about the team's day-to-day work changes before step 4.

## Consequences

- Production gets a durable store and concurrent access; dev/demo are unaffected
  (default `memory`).
- A new operational surface appears: migrations, backups, a connection string (a secret,
  **never** in git — see DATA_POLICY.md). This is a new infrastructure responsibility.
- The schema is deliberately narrow (only what the CRM owns) — numbers/prices stay
  behind `ErpGateway`, with no duplication of the ERP's accounting contour.

## Alternatives

- **SQLite** — rejected: weak concurrency for 7 simultaneous sales reps, and the path to
  production leads to Postgres anyway → an unnecessary extra migration.
- **Stay on in-memory** — rejected for production: a restart loses data, no history or
  concurrent access. Stays the default for dev/tests/demos only.
- **Drizzle / another ORM** — Prisma was chosen for its fit with strict TS and the
  already-built implementation on the branch; switching ORMs now would be an
  unjustified rewrite.
- **Managed cloud Postgres only** — not fixed as the only path: data residency
  requirements may call for self-hosting; Postgres supports both.
