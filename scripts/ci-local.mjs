#!/usr/bin/env node
/*
 * A local equivalent of the GitHub CI — mirrors `.github/workflows/ci.yml`.
 *
 * Why: while GitHub Actions is unavailable (account billing) or when working
 * offline — run the same quality gates locally before merging a PR.
 *
 * Run:      npm run ci:local
 * Flags:
 *   --no-pg        skip the postgres-smoke job (if Docker isn't available)
 *   --install      run `npm ci` before quality (as in CI; skipped by default)
 *   --base <ref>   base ref for commitlint (defaults to origin/main)
 *
 * Mirrors 3 jobs:
 *   quality        — typecheck + lint + format:check + test + build
 *   commitlint     — Conventional Commits for the branch's commits relative to base
 *   postgres-smoke — spins up a temporary Postgres (Docker): db:deploy + drift-check + db:seed + test:smoke
 *
 * Note: `next build` does NOT work in a git worktree with a symlinked node_modules
 * (junction): Turbopack rejects a symlink outside the project root. Run ci:local in
 * a regular clone or in a worktree with a real `npm ci`, not a junction.
 */

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const noPg = args.includes("--no-pg");
const doInstall = args.includes("--install");
const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "origin/main";

/** A synchronous sleep with no external commands (cross-platform). */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const results = [];

function step(name, cmd, env = {}) {
  process.stdout.write(`\n=== ${name} ===\n  $ ${cmd}\n`);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", env: { ...process.env, ...env } });
  const ok = r.status === 0;
  results.push({ name, status: ok ? "pass" : "FAIL" });
  return ok;
}

function skip(name, why) {
  process.stdout.write(`\n=== ${name} ===  SKIP (${why})\n`);
  results.push({ name, status: `skip (${why})` });
}

function hasDocker() {
  return spawnSync("docker version", { shell: true, stdio: "ignore" }).status === 0;
}

// ───────────────────────── quality ──────────────────────────
if (doInstall) step("install (npm ci)", "npm ci");

const quality = [
  ["quality: typecheck", "npm run typecheck"],
  ["quality: lint", "npm run lint"],
  ["quality: format:check", "npm run format:check"],
  ["quality: test", "npm test"],
  ["quality: build", "npm run build"],
];
// Don't stop on the first failure — we want the full picture, like independent CI jobs.
for (const [name, cmd] of quality) {
  step(name, cmd);
}

// ──────────────────────── commitlint ───────────────────────
step("commitlint", `npx commitlint --from ${base} --to HEAD --verbose`);

// ────────────────────── postgres-smoke ─────────────────────
const PG_NAME = "crm-pro-ci-local-pg";
// A high port to avoid clashing with a local/demo Postgres (5432) or other
// projects (e.g. 5433). Overridable via CI_LOCAL_PG_PORT.
const PG_PORT = Number(process.env.CI_LOCAL_PG_PORT) || 55432;
const PG_ENV = {
  DATABASE_URL: `postgresql://crmpro:crmpro@localhost:${PG_PORT}/crmpro?schema=public`,
  PERSISTENCE_MODE: "postgres",
};

if (noPg) {
  skip("postgres-smoke", "--no-pg");
} else if (!hasDocker()) {
  skip("postgres-smoke", "Docker not available — run with --no-pg or start Docker");
} else {
  spawnSync(`docker rm -f ${PG_NAME}`, { shell: true, stdio: "ignore" });
  const started = step(
    "postgres-smoke: starting Postgres",
    `docker run -d --name ${PG_NAME} -e POSTGRES_USER=crmpro -e POSTGRES_PASSWORD=crmpro -e POSTGRES_DB=crmpro -p ${PG_PORT}:5432 postgres:17-alpine`,
  );
  try {
    if (started) {
      process.stdout.write("  waiting for Postgres to be ready");
      let ready = false;
      for (let i = 0; i < 30; i++) {
        const r = spawnSync(`docker exec ${PG_NAME} pg_isready -U crmpro -d crmpro`, {
          shell: true,
          stdio: "ignore",
        });
        if (r.status === 0) {
          ready = true;
          break;
        }
        process.stdout.write(".");
        sleep(1000);
      }
      process.stdout.write("\n");
      if (!ready) {
        results.push({ name: "postgres-smoke: readiness", status: "FAIL (timeout)" });
      } else {
        step("postgres-smoke: db:deploy", "npm run db:deploy", PG_ENV);
        step(
          "postgres-smoke: drift-check",
          "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code",
          PG_ENV,
        );
        step("postgres-smoke: db:seed", "npm run db:seed", PG_ENV);
        step("postgres-smoke: test:smoke", "npm run test:smoke", PG_ENV);
      }
    }
  } finally {
    spawnSync(`docker rm -f ${PG_NAME}`, { shell: true, stdio: "ignore" });
  }
}

// ─────────────────────────── summary ──────────────────────────
process.stdout.write("\n──────── Local CI summary ────────\n");
let failed = 0;
for (const { name, status } of results) {
  const isFail = status.startsWith("FAIL");
  if (isFail) failed++;
  const mark = isFail ? "x" : status.startsWith("skip") ? "-" : "+";
  process.stdout.write(`  [${mark}] ${name.padEnd(34)} ${status}\n`);
}
if (failed > 0) {
  process.stdout.write(`\n${failed} step(s) failed.\n`);
  process.exit(1);
}
process.stdout.write("\nAll green — the CI equivalent passed.\n");
