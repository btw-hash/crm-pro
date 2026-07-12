# Contributing

A short guide for working on this repository.

## First run

```bash
git clone https://github.com/btw-hash/crm-pro.git
cd crm-pro
npm install
npm run dev      # http://localhost:3000
```

## Branches

One main branch — **`main`** (always in a working state, never push to it directly).
Each task gets its own short-lived branch off `main`:

```
main ──●─────────●─────────●──►   protected: only via PR + green CI
        \        \        /
  feat/4 ●──PR───/        /       pick a task → branch → PR → merge → delete branch
  feat/7 ────────●──PR───/
```

- **Branch name:** `type/<task-number>-<short-slug>` — e.g. `feat/4-audit`,
  `fix/12-buttons`, `chore/deps`, `docs/readme`.
- A branch lives **hours to a couple of days**, not weeks.

## Workflow

1. Pick a task in [Issues](https://github.com/btw-hash/crm-pro/issues), assign yourself.
2. Create a branch: `git checkout main && git pull && git checkout -b feat/4-audit`.
3. Write code. Before opening a PR, run: `npm run verify`.
4. Push: `git push -u origin feat/4-audit`.
5. Open a **Pull Request** against `main`. In the description, add `Closes #4` (the
   issue closes automatically on merge).
6. Wait for **green CI**, merge with **Squash and merge**, delete the branch.

## Commits — Conventional Commits

Format: `type(scope): description`. Types: `feat`, `fix`, `refactor`, `perf`, `test`,
`docs`, `style`, `build`, `ci`, `chore`. Checked automatically (commitlint).

```
feat(deals): add stage-transition buttons
fix(erp): parse stock levels correctly
```

## Quality gates (automatic)

- **pre-commit** — format and lint on changed files (lint-staged);
- **pre-push** — types and tests (`typecheck` + `test`);
- **CI on PR** — everything above + build + commit-message check.

One command to run everything: `npm run verify`.

## Where things live

- **Tasks** → Issues tab. **Changes under review** → Pull requests. **Whether checks
  passed** → Actions tab (green checkmark).
- **Architecture and rules** → [CLAUDE.md](CLAUDE.md). **Data policy** →
  [docs/DATA_POLICY.md](docs/DATA_POLICY.md). **Path to production** →
  [docs/RUNBOOK.md](docs/RUNBOOK.md).
