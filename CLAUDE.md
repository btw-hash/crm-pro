# CLAUDE.md — project rules for AI assistants and review

Read by Claude Code (`/review`, local work) and by CI review actions.
Follow it when writing code and reviewing PRs.

## What this is

CRM Pro — a CRM for the sales team of a B2B ingredients distributor (demo company:
Millbrook Foods, flour & bakery ingredients). Stack: Next.js 16 + TypeScript (strict),
clean architecture. The git repository root is this folder.

## Priority #0: quality and confidence (above speed and feature count)

The project's main criterion is **quality and confidence that everything works
perfectly**. That matters more than feature count or speed. Nothing counts as done
until it is proven to work:

- **Verify by running, not by assumption.** "Should work" is not a result. Every change
  is confirmed by tests + a real scenario (UI — in the browser: golden path + one edge
  case). Claim "done" only after verifying, stating explicitly what was verified.
- **`npm run verify` green** (typecheck + lint + format + test) before every PR.
- **TDD for affected logic** (domain/use-cases); edge cases thought through and covered.
- **Strict TS** — no `any`/`as` without a clear reason.
- When in doubt, don't close the task — drive it to a verified state.

Fewer features, each working flawlessly, beat many half-baked ones.

## Product principle: passive capture

The manager works (calls, writes, meets) → AI extracts the facts → the manager confirms
(~30 sec) → the CRM is filled in. The manager is **not a data-entry operator**. The human
confirmation step must never be removed: dirty data poisons forecasts and reminders. The
principle applies to every channel (voice→act, calls, messengers, email).

## Architecture rules (clean architecture)

Dependencies point INWARD. A boundary violation is grounds to block a PR.

- `src/domain` — business logic. **No** imports from Next, ERP, AI, infrastructure, React.
- `src/application` — use-cases + ports (interfaces). Depends only on `domain`.
- `src/infrastructure` — adapters (ERP, AI, repositories) implementing the ports. The
  outside world lives here and only here.
- `src/app` — Next.js (presentation). Calls use-cases only through `composition-root`.

ERP and AI boundaries sit behind the `ErpGateway` / `AiGateway` ports. Swapping
"stub → real ERP" happens in `composition-root` via `ERP_MODE`, without touching
use-cases.

**AI rule:** the model extracts and drafts; numbers/prices/stock come from the ERP and
deterministic calculations; a human always confirms the result. AI never invents amounts.

## Prisma migrations

ALWAYS: every `schema.prisma` change → `npx prisma migrate dev --name <description>`
(a new additive ALTER file in `prisma/migrations/`). Deploy — `prisma migrate deploy`.

NEVER: edit `prisma/migrations/0_init/migration.sql` after it was first created.
`migrate deploy` sees `0_init` as already applied and will not re-apply it — edits there
never reach existing databases, including CI postgres-smoke.

## Commits and branches

- **Conventional Commits** (enforced by commitlint): `type(scope): subject`.
  Types: feat, fix, refactor, perf, test, docs, style, build, ci, chore, revert.
- **GitHub Flow**: short branches `feat/*`, `fix/*`, `chore/*` off `main`; changes land
  via PR on green CI.

## Quality gates

- `npm run verify` = typecheck + lint + format:check + test (run before a PR).
- pre-commit: lint-staged (eslint --fix + prettier on staged files).
- pre-push: typecheck + tests.
- CI: all of the above + `build` + commitlint + postgres-smoke.
- **`npm run ci:local`** — local CI mirror (`scripts/ci-local.mjs`): quality (incl.
  `build`) + commitlint + postgres-smoke (spins up a temporary Docker Postgres).
  Flags: `--no-pg`, `--install`, `--base <ref>`.
- Cover affected logic (domain/use-cases) with tests (TDD).

## Change showcase — an HTML changelog per PR

For every PR with visible changes (feature/UI fix/behavior) — build an HTML showcase
page and put it in `docs/changes/<branch>.html` (in git). The page must contain:

- **What changed** — a list of features/fixes tied to the PR/issue.
- **Before → after** — a short contrast per item.
- **Repro steps** — a numbered "open X → click Y → see Z" sequence so anyone can
  visually verify the change in a browser without reading code.
- Screenshots — when possible; they don't block the PR.

Pure docs/chore PRs with no visible changes may skip it.

## Data and security — see `docs/DATA_POLICY.md`

- **Never commit:** secrets/`.env`/keys, real personal data, ERP dumps with PII,
  production connection strings, real price lists.
- **Data-residency LLM policy:** raw PII goes only to the approved compliant provider;
  code and anonymized/synthetic data may use any provider. See ADR-0007.
- Dev data — synthetic/anonymized only.

## What to look at in review

1. Clean-architecture boundaries intact (imports point inward, domain stays pure).
2. Numbers come from the ERP/deterministic code, not from AI; a human confirms results.
3. Tests cover the affected logic; strict TS without unneeded `any`/`as`.
4. No secrets/PII/real price lists in the diff or `.env`.
5. Commit message and PR title follow the convention; the task is referenced.
